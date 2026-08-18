/**
 * Claimable service-credit aggregation.
 *
 * Sums the estimated credits owed on breached KPI results. Credits are
 * recomputed live from each KPI's structured credit terms and its contract MRC
 * (rather than trusting the stored `credit_applied`) so the figure stays correct
 * for results entered before the calculator existed, and if credit terms change.
 */
import { db } from '@contractly/db'
import { kpiResults, kpis, contracts, submissionPeriods, organisations } from '@contractly/db/schema'
import { eq, and, inArray } from '@contractly/db'
import { planHasFeature } from '@contractly/types'
import { computeKpiCredit, contractMrc } from './kpi-scoring'

export type ClaimableCredits = { total: number; count: number }

/** Credit recovery is a Professional-and-above feature. */
export async function orgHasCreditRecovery(orgId: string): Promise<boolean> {
  const [org] = await db
    .select({ plan: organisations.plan })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1)
  return org ? planHasFeature(org.plan, 'creditRecovery') : false
}

/**
 * Total claimable credits for an org, optionally scoped to a set of contracts.
 *
 * Counts only breached, non-exempt results in `locked` periods — i.e. finalised
 * performance that has a defensible claim behind it. Open periods are excluded
 * because their numbers can still change.
 */
export async function getClaimableCredits(opts: {
  orgId: string
  contractIds?: string[]
}): Promise<ClaimableCredits> {
  const { orgId, contractIds } = opts
  if (contractIds && contractIds.length === 0) return { total: 0, count: 0 }

  const conditions = [
    eq(kpiResults.orgId, orgId),
    eq(kpiResults.resultStatus, 'breach'),
    eq(submissionPeriods.status, 'locked'),
  ]
  if (contractIds) conditions.push(inArray(kpiResults.contractId, contractIds))

  const rows = await db
    .select({
      actualValue: kpiResults.actualValue,
      exemptionStatus: kpiResults.exemptionStatus,
      resultType: kpis.resultType,
      targetValue: kpis.targetValue,
      targetValueMax: kpis.targetValueMax,
      targetOperator: kpis.targetOperator,
      creditPerUnit: kpis.creditPerUnit,
      creditPercentMrc: kpis.creditPercentMrc,
      creditCapPercent: kpis.creditCapPercent,
      creditCapAmount: kpis.creditCapAmount,
      monthlyValue: contracts.monthlyValue,
      annualValue: contracts.annualValue,
    })
    .from(kpiResults)
    .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
    .innerJoin(contracts, eq(kpiResults.contractId, contracts.id))
    .innerJoin(submissionPeriods, eq(kpiResults.periodId, submissionPeriods.id))
    .where(and(...conditions))

  let total = 0
  let count = 0
  for (const r of rows) {
    // An approved exemption waives the credit even if status is still 'breach'.
    if (r.exemptionStatus === 'approved') continue
    const credit = computeKpiCredit({
      kpi: r,
      resultStatus: 'breach',
      actualValue: r.actualValue,
      mrc: contractMrc(r),
    })
    if (credit > 0) {
      total += credit
      count += 1
    }
  }

  return { total: Math.round(total * 100) / 100, count }
}
