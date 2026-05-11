export const dynamic = 'force-dynamic'
// Allow up to 5 minutes for large contracts with many documents
export const maxDuration = 300

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@contractly/db'
import { users, contracts, contractDocuments, kpis, contractKeyTerms } from '@contractly/db/schema'
import { eq, and, isNotNull, ne } from '@contractly/db'
import { extractContractData, type DocumentInput } from '@contractly/ai'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await context.params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's org from the users table
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!userRecord) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fetch contract and verify it belongs to the user's org
  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Fetch contract documents that have extracted text
  const documents = await db
    .select()
    .from(contractDocuments)
    .where(
      and(
        eq(contractDocuments.contractId, contractId),
        isNotNull(contractDocuments.extractedText),
        ne(contractDocuments.extractedText, '')
      )
    )

  if (documents.length === 0) {
    return NextResponse.json(
      { error: 'No extracted text found. Please upload and process documents first.' },
      { status: 400 }
    )
  }

  // Mark contract as processing
  await db
    .update(contracts)
    .set({ extractionStatus: 'processing', updatedAt: new Date() })
    .where(eq(contracts.id, contractId))

  try {
    // Build DocumentInput array for AI
    const documentInputs: DocumentInput[] = documents.map((doc) => ({
      text: doc.extractedText!,
      docType: doc.docType,
      hierarchyOrder: doc.hierarchyOrder,
      name: doc.name,
    }))

    // Run AI extraction
    const perspective = (contract.perspective ?? 'buyer') as 'buyer' | 'vendor'
    const result = await extractContractData(documentInputs, perspective)

    // Delete existing AI-extracted KPIs, then insert new ones
    await db
      .delete(kpis)
      .where(and(eq(kpis.contractId, contractId), eq(kpis.addedBy, 'ai')))

    const kpiInserts = result.kpis.map((kpi) => ({
      contractId,
      orgId: userRecord.orgId,
      name: kpi.name,
      description: kpi.description ?? null,
      kpiType: kpi.kpi_type,
      category: kpi.category ?? null,
      targetValue: kpi.target_value != null ? String(kpi.target_value) : null,
      targetOperator: kpi.target_operator ?? 'gte',
      targetValueMax: kpi.target_value_max != null ? String(kpi.target_value_max) : null,
      unit: kpi.unit ?? null,
      unitLabel: kpi.unit_label ?? null,
      cadence: kpi.cadence ?? 'monthly',
      creditFormula: kpi.credit_formula ?? null,
      creditPerUnit: kpi.credit_per_unit != null ? String(kpi.credit_per_unit) : null,
      creditPercentMrc: kpi.credit_percent_mrc != null ? String(kpi.credit_percent_mrc) : null,
      creditCapPercent: kpi.credit_cap_percent != null ? String(kpi.credit_cap_percent) : null,
      creditCapAmount: kpi.credit_cap_amount != null ? String(kpi.credit_cap_amount) : null,
      clauseRef: kpi.clause_ref ?? null,
      addedBy: 'ai' as const,
      addedByUserId: user.id,
      isActive: false,
    }))

    if (kpiInserts.length > 0) {
      await db.insert(kpis).values(kpiInserts)
    }

    // Delete existing key terms, then insert new ones
    await db
      .delete(contractKeyTerms)
      .where(eq(contractKeyTerms.contractId, contractId))

    const termInserts = result.key_terms.map((term) => ({
      contractId,
      orgId: userRecord.orgId,
      termType: term.term_type,
      label: term.label,
      value: term.value,
      clauseRef: term.clause_ref ?? null,
      isAiFlagged: term.is_ai_flagged,
      flagReason: term.flag_reason ?? null,
    }))

    if (termInserts.length > 0) {
      await db.insert(contractKeyTerms).values(termInserts)
    }

    // Mark contract as complete
    await db
      .update(contracts)
      .set({
        extractionStatus: 'complete',
        aiExtractionNotes: result.ai_notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, contractId))

    return NextResponse.json({
      success: true,
      kpiCount: kpiInserts.length,
      termCount: termInserts.length,
    })
  } catch (error) {
    console.error('AI extraction failed for contract', contractId, error)

    // Mark contract as failed
    await db
      .update(contracts)
      .set({ extractionStatus: 'failed', updatedAt: new Date() })
      .where(eq(contracts.id, contractId))

    return NextResponse.json(
      { error: 'AI extraction failed. Please try again.' },
      { status: 500 }
    )
  }
}
