export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@contractly/db'
import { portalTokens, kpiResults, kpis, contracts } from '@contractly/db/schema'
import { eq, and } from '@contractly/db'
import { scoreKpiResult, computeKpiCredit, contractMrc } from '@/lib/kpi-scoring'

async function validateToken(token: string) {
  const [pt] = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!pt) return null
  if (new Date(pt.expiresAt) < new Date()) return null

  // Mark opened_at on first use
  if (!pt.openedAt) {
    await db
      .update(portalTokens)
      .set({ openedAt: new Date() })
      .where(eq(portalTokens.id, pt.id))
  }

  return pt
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, resultId, actualValue, comment, exemptionClaimed, exemptionReason } = body

  if (!token || !resultId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const pt = await validateToken(token)
  if (!pt) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

  // Writes are only allowed while the period is open — once submitted or
  // locked, results are immutable from the portal.
  const { submissionPeriods } = await import('@contractly/db/schema')
  const [period] = await db
    .select({ status: submissionPeriods.status })
    .from(submissionPeriods)
    .where(eq(submissionPeriods.id, pt.periodId))
    .limit(1)
  if (!period || period.status !== 'open') {
    return NextResponse.json({ error: 'This period is no longer accepting changes' }, { status: 409 })
  }

  // Verify this result belongs to this period
  const [existing] = await db
    .select()
    .from(kpiResults)
    .where(and(eq(kpiResults.id, resultId), eq(kpiResults.periodId, pt.periodId)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: 'Result not found' }, { status: 404 })

  // Fetch KPI (status + credit terms) and its contract's MRC
  const [kpi] = await db.select().from(kpis).where(eq(kpis.id, existing.kpiId)).limit(1)
  const [contract] = await db
    .select({ monthlyValue: contracts.monthlyValue, annualValue: contracts.annualValue })
    .from(contracts)
    .where(eq(contracts.id, existing.contractId))
    .limit(1)

  // Calculate result status, then estimate the service credit owed on a breach.
  const scored = kpi ? scoreKpiResult(kpi, actualValue) : null
  const resultStatus: string | null = scored ?? existing.resultStatus
  const creditApplied = kpi
    ? computeKpiCredit({ kpi, resultStatus, actualValue, mrc: contractMrc(contract) })
    : 0

  await db
    .update(kpiResults)
    .set({
      actualValue: actualValue || null,
      comment: comment || null,
      exemptionClaimed: !!exemptionClaimed,
      exemptionReason: exemptionReason || null,
      exemptionStatus: exemptionClaimed ? 'pending' : 'none',
      resultStatus,
      creditApplied: String(creditApplied),
      submittedByEmail: pt.vendorEmail ?? 'vendor',
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(kpiResults.id, resultId))

  return NextResponse.json({ success: true, resultStatus })
}
