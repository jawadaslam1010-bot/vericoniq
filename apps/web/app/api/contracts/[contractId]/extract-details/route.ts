export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@contractly/db'
import { users, contracts, contractDocuments } from '@contractly/db/schema'
import { eq, and, isNotNull, ne } from '@contractly/db'
import { anthropic, ANTHROPIC_MODEL } from '@contractly/ai/client'
import { contractDetailsPrompt } from '@contractly/ai/prompts/details-extraction'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [userRecord] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!userRecord) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  // Gather all documents with extracted text, sorted by hierarchy (highest precedence first)
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
      { error: 'No extracted text found. Upload and process documents first.' },
      { status: 400 }
    )
  }

  // Build document content — sorted by hierarchy order, no truncation
  const sorted = [...documents].sort((a, b) => a.hierarchyOrder - b.hierarchyOrder)
  let docContent = `# CONTRACT DOCUMENTS (${sorted.length} files)\n\n`
  for (const doc of sorted) {
    docContent += `---\n## ${doc.name}\nType: ${doc.docType} | Hierarchy: ${doc.hierarchyOrder}\n\n`
    docContent += doc.extractedText!
    docContent += '\n\n'
  }

  try {
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: contractDetailsPrompt(),
      messages: [{ role: 'user', content: docContent }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    let det: Record<string, unknown>
    try {
      det = JSON.parse(jsonText)
    } catch {
      console.error('[extract-details] Failed to parse response:', rawText.slice(0, 300))
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 })
    }

    // Build update object — only overwrite fields AI actually found
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (det.contract_number)         updates.contractNumber    = det.contract_number
    if (det.start_date)              updates.startDate         = det.start_date
    if (det.end_date)                updates.endDate           = det.end_date
    if (det.notice_period_days != null) updates.noticePeriodDays = det.notice_period_days
    if (det.notice_deadline)         updates.noticeDeadline    = det.notice_deadline
    if (det.auto_renewal != null)    updates.autoRenewal       = det.auto_renewal
    if (det.auto_renewal_months != null) updates.autoRenewalMonths = det.auto_renewal_months
    if (det.annual_value != null)    updates.annualValue       = String(det.annual_value)
    if (det.monthly_value != null)   updates.monthlyValue      = String(det.monthly_value)
    if (det.currency)                updates.currency          = det.currency

    await db.update(contracts).set(updates).where(eq(contracts.id, contractId))

    const fieldsFound = Object.keys(updates).filter(k => k !== 'updatedAt')
    console.log('[extract-details] Raw AI response:', JSON.stringify(det))
    console.log('[extract-details] Fields updated:', fieldsFound)
    return NextResponse.json({ success: true, fieldsFound, raw: det })

  } catch (error) {
    console.error('[extract-details] Error:', error)
    return NextResponse.json({ error: 'Extraction failed. Please try again.' }, { status: 500 })
  }
}
