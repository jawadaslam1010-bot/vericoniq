/**
 * Shared KPI scoring and service-credit calculation.
 *
 * Both the operator entry path (server/routers/submissions.ts) and the vendor
 * portal path (app/api/portal/save-result/route.ts) run identical logic, so it
 * lives here once. Pure functions — no DB, no side effects — so they are safe to
 * call from server components, route handlers, and tRPC procedures alike.
 */

/** The KPI fields these functions read. Numerics arrive from Drizzle as strings. */
export type ScoringKpi = {
  resultType?: string | null
  targetValue?: string | null
  targetValueMax?: string | null
  targetOperator?: string | null
  creditPerUnit?: string | null
  creditPercentMrc?: string | null
  creditCapPercent?: string | null
  creditCapAmount?: string | null
}

export type ResultStatus = 'met' | 'risk' | 'breach' | 'exempt'

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Score an actual value against a KPI's target.
 *
 * Returns 'met' | 'risk' | 'breach', or `null` when no status can be derived
 * (empty input, or a numeric KPI with no target). Callers keep the existing
 * stored status when this returns null.
 *
 * Numeric KPIs that clear their threshold but sit within 5% of it are flagged
 * 'risk' rather than 'met'. 'exempt' is never returned here — that is only set
 * when an operator approves an exemption claim.
 */
export function scoreKpiResult(kpi: ScoringKpi, actualValue: string | null | undefined): ResultStatus | null {
  if (actualValue == null || actualValue === '') return null

  if (kpi.resultType === 'binary') {
    // '1' = met, anything else = not met
    return actualValue === '1' ? 'met' : 'breach'
  }

  const target = num(kpi.targetValue)
  if (target == null) return null

  const actual = num(actualValue)
  if (actual == null) return null

  const op = kpi.targetOperator ?? 'gte'
  let met = false
  if (op === 'gte') met = actual >= target
  else if (op === 'lte') met = actual <= target
  else if (op === 'eq') met = actual === target
  else if (op === 'between') {
    const max = num(kpi.targetValueMax) ?? target
    met = actual >= target && actual <= max
  }

  if (!met) return 'breach'

  // Risk zone: cleared a one-sided threshold but within 5% of it. Only meaningful
  // for gte/lte — a value inside a between-range or matching an eq target is a
  // clean 'met'.
  if (op === 'gte' || op === 'lte') {
    const denom = Math.abs(target) || 1
    const pct = op === 'gte' ? (actual - target) / denom : (target - actual) / denom
    return pct < 0.05 ? 'risk' : 'met'
  }
  return 'met'
}

/**
 * Compute the service credit owed for a single KPI result.
 *
 * Credits only accrue on a 'breach'. Two structured formulas are supported,
 * mirroring how they are extracted from contracts:
 *   - Percent of monthly recurring charge (MRC): credit = MRC × creditPercentMrc%
 *   - Per-unit: credit = creditPerUnit × units of shortfall
 *     (units = |target − actual| for numeric KPIs, 1 for a binary miss)
 * When both are present, percent-of-MRC wins — it is the dominant SLA mechanic.
 *
 * Per-KPI caps are then applied (absolute amount, and/or percent of MRC).
 *
 * `mrc` is the contract's monthly value; pass null if unknown (percent-of-MRC
 * formulas then yield 0, since there is no base to apply them to).
 *
 * This is a best-effort estimate from the structured terms. Cumulative,
 * cross-KPI period caps and bespoke tier tables are not modelled here — the
 * figure is meant to flag recoverable value for an operator to confirm, not to
 * replace a manual reconciliation of a complex credit schedule.
 */
export function computeKpiCredit(opts: {
  kpi: ScoringKpi
  resultStatus: string | null | undefined
  actualValue: string | null | undefined
  mrc: number | null
}): number {
  const { kpi, resultStatus, actualValue, mrc } = opts
  if (resultStatus !== 'breach') return 0

  const pctMrc = num(kpi.creditPercentMrc)
  const perUnit = num(kpi.creditPerUnit)

  let amount = 0
  if (pctMrc != null && mrc != null) {
    amount = mrc * (pctMrc / 100)
  } else if (perUnit != null) {
    let units = 1
    if (kpi.resultType !== 'binary') {
      const target = num(kpi.targetValue)
      const actual = num(actualValue)
      if (target != null && actual != null) units = Math.abs(target - actual)
    }
    amount = perUnit * units
  }

  // Per-KPI caps.
  const capAmount = num(kpi.creditCapAmount)
  if (capAmount != null) amount = Math.min(amount, capAmount)
  const capPct = num(kpi.creditCapPercent)
  if (capPct != null && mrc != null) amount = Math.min(amount, mrc * (capPct / 100))

  return round2(Math.max(0, amount))
}

/** MRC from a contract row — prefer the explicit monthly value, else annual/12. */
export function contractMrc(contract: { monthlyValue?: string | null; annualValue?: string | null } | null | undefined): number | null {
  if (!contract) return null
  const monthly = num(contract.monthlyValue)
  if (monthly != null) return monthly
  const annual = num(contract.annualValue)
  return annual != null ? round2(annual / 12) : null
}
