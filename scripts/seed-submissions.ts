/**
 * Seed script — generates 12 months of submission periods + KPI results
 * for the first contract found in the system.
 *
 * Run: npx tsx scripts/seed-submissions.ts
 * From the repo root.
 */

import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set. Export it (or source .env.local) before running.')

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })

// ─── Helpers ────────────────────────────────────────────────────────────────

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0) // month is 1-indexed here
  return d.toISOString().split('T')[0]
}

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function addMonth(year: number, month: number): [number, number] {
  if (month === 12) return [year + 1, 1]
  return [year, month + 1]
}

/** Seeded pseudo-random so results are consistent across runs */
function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function pickOutcome(seed: number): 'met' | 'risk' | 'breach' | 'exempt' {
  const r = seededRand(seed)
  if (r < 0.05) return 'exempt'
  if (r < 0.15) return 'breach'
  if (r < 0.25) return 'risk'
  return 'met'
}

/**
 * Given a KPI target and operator, generate a plausible actual value
 * for the desired outcome.
 */
function generateValue(
  targetValue: string | null,
  targetOperator: string,
  targetValueMax: string | null,
  resultType: string,
  outcome: 'met' | 'risk' | 'breach' | 'exempt',
  seed: number
): string | null {
  if (outcome === 'exempt') return null
  if (resultType === 'binary') return outcome === 'breach' ? '0' : '1'
  if (targetValue == null) return null

  const target = parseFloat(targetValue)
  const jitter = seededRand(seed + 100)

  if (targetOperator === 'gte') {
    if (outcome === 'met')    return String(Math.round((target + target * (0.1 + jitter * 0.4)) * 100) / 100)
    if (outcome === 'risk')   return String(Math.round((target + target * jitter * 0.04) * 100) / 100)
    if (outcome === 'breach') return String(Math.round((target * (0.7 + jitter * 0.25)) * 100) / 100)
  }

  if (targetOperator === 'lte') {
    if (outcome === 'met')    return String(Math.round((target * (0.5 + jitter * 0.45)) * 100) / 100)
    if (outcome === 'risk')   return String(Math.round((target * (0.97 + jitter * 0.025)) * 100) / 100)
    if (outcome === 'breach') return String(Math.round((target * (1.05 + jitter * 0.3)) * 100) / 100)
  }

  if (targetOperator === 'between') {
    const max = targetValueMax ? parseFloat(targetValueMax) : target * 1.5
    const mid = (target + max) / 2
    if (outcome === 'met')    return String(Math.round(mid * 100) / 100)
    if (outcome === 'risk')   return String(Math.round((target + (max - target) * jitter * 0.08) * 100) / 100)
    if (outcome === 'breach') return String(Math.round((target * (0.5 + jitter * 0.4)) * 100) / 100)
  }

  // eq — just return target ± small noise
  return String(Math.round((target * (0.9 + jitter * 0.2)) * 100) / 100)
}

function calcResultStatus(
  actualValue: string | null,
  targetValue: string | null,
  targetOperator: string,
  targetValueMax: string | null,
  resultType: string,
  exemptionClaimed: boolean,
): string | null {
  if (exemptionClaimed) return null // will be reviewed by operator
  if (!actualValue) return null

  if (resultType === 'binary') {
    return actualValue === '1' ? 'met' : 'breach'
  }

  if (!targetValue) return null
  const actual = parseFloat(actualValue)
  const target = parseFloat(targetValue)
  const op = targetOperator ?? 'gte'

  let met = false
  if (op === 'gte') met = actual >= target
  else if (op === 'lte') met = actual <= target
  else if (op === 'eq') met = actual === target
  else if (op === 'between') {
    const max = targetValueMax ? parseFloat(targetValueMax) : target
    met = actual >= target && actual <= max
  }

  if (met) {
    const pct = op === 'gte'
      ? (actual - target) / Math.abs(target)
      : (target - actual) / Math.abs(target)
    return pct < 0.05 ? 'risk' : 'met'
  }
  return 'breach'
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // 1. Pick contract
  const [contract] = await sql`
    SELECT id, name, org_id FROM contracts LIMIT 1
  `
  if (!contract) throw new Error('No contracts found')
  console.log(`\nSeeding for contract: ${contract.name} (${contract.id})\n`)

  // 2. Load active KPIs
  const kpis = await sql`
    SELECT id, cadence, target_value, target_operator, target_value_max, result_type
    FROM kpis
    WHERE contract_id = ${contract.id}
      AND org_id = ${contract.org_id}
      AND is_active = true
  `
  console.log(`Found ${kpis.length} active KPIs`)

  // 3. Clear existing submission data for this contract
  const existingPeriods = await sql`
    SELECT id FROM submission_periods WHERE contract_id = ${contract.id}
  `
  if (existingPeriods.length > 0) {
    const periodIds = existingPeriods.map(p => p.id)
    await sql`DELETE FROM kpi_results WHERE period_id = ANY(${periodIds})`
    await sql`DELETE FROM submission_periods WHERE contract_id = ${contract.id}`
    console.log(`Cleared ${existingPeriods.length} existing periods`)
  }

  // 4. Get a user id to use as createdBy
  const [user] = await sql`SELECT id FROM users WHERE org_id = ${contract.org_id} LIMIT 1`
  if (!user) throw new Error('No user found for org')

  // 5. Build 12 months: Jul 2025 → Jun 2026 (AU financial year)
  let year = 2025
  let month = 7

  for (let i = 0; i < 12; i++) {
    const periodStart = firstDayOfMonth(year, month)
    const periodEnd   = lastDayOfMonth(year, month)
    const [dueYear, dueMonth] = addMonth(year, month)
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-05`
    const status = i < 11 ? 'locked' : 'open' // last month stays open

    const isQuarterEnd = [3, 6, 9, 12].includes(month)
    const isYearEnd    = [6, 12].includes(month)

    // Insert period
    const [period] = await sql`
      INSERT INTO submission_periods (contract_id, org_id, period_start, period_end, due_date, status, created_by)
      VALUES (${contract.id}, ${contract.org_id}, ${periodStart}, ${periodEnd}, ${dueDate}, ${status}, ${user.id})
      RETURNING id
    `

    // Filter KPIs by cadence
    const dueKpis = kpis.filter(kpi => {
      const cadence = kpi.cadence ?? 'monthly'
      if (cadence === 'weekly' || cadence === 'monthly') return true
      if (cadence === 'quarterly') return isQuarterEnd
      if (cadence === 'annual') return isYearEnd
      return true
    })

    if (dueKpis.length === 0) {
      console.log(`  ${periodStart}: 0 KPIs due`)
      ;[year, month] = addMonth(year, month)
      continue
    }

    // Generate results — open period gets no values yet
    const resultRows = dueKpis.map((kpi, j) => {
      if (status === 'open') {
        return {
          period_id: period.id,
          kpi_id: kpi.id,
          contract_id: contract.id,
          org_id: contract.org_id,
          actual_value: null,
          result_status: null,
          exemption_claimed: false,
          exemption_status: 'none',
          submitted_by_email: null,
          submitted_at: null,
        }
      }

      const EXEMPTION_REASONS = [
        'Service disruption caused by third-party network outage outside vendor control.',
        'Natural disaster (flooding) impacted data centre access for 6 days during this period.',
        'Client-initiated change freeze prevented remediation work from proceeding.',
        'Hardware failure on client-owned infrastructure delayed resolution beyond SLA window.',
        'Regulatory compliance review mandated by client required system downtime.',
        'Force majeure event — state-wide power outage affected primary and backup sites.',
        'Client delayed approval of change request, preventing timely implementation.',
        'Upstream supplier outage (Tier 1 carrier) outside vendor control caused service degradation.',
      ]

      const outcome = pickOutcome(i * 1000 + j)
      const exemptionClaimed = outcome === 'exempt'
      const exemptionReason = exemptionClaimed
        ? EXEMPTION_REASONS[Math.floor(seededRand(i * 1000 + j + 500) * EXEMPTION_REASONS.length)]
        : null
      const actualValue = exemptionClaimed
        ? null
        : generateValue(kpi.target_value, kpi.target_operator, kpi.target_value_max, kpi.result_type ?? 'numeric', outcome, i * 1000 + j)
      const resultStatus = exemptionClaimed
        ? null
        : calcResultStatus(actualValue, kpi.target_value, kpi.target_operator, kpi.target_value_max, kpi.result_type ?? 'numeric', false)

      return {
        period_id: period.id,
        kpi_id: kpi.id,
        contract_id: contract.id,
        org_id: contract.org_id,
        actual_value: actualValue,
        result_status: resultStatus,
        exemption_claimed: exemptionClaimed,
        exemption_reason: exemptionReason,
        exemption_status: exemptionClaimed ? 'pending' : 'none',
        submitted_by_email: 'vendor@example.com',
        submitted_at: new Date(periodEnd + 'T10:00:00Z'),
      }
    })

    await sql`INSERT INTO kpi_results ${sql(resultRows)}`

    const met     = resultRows.filter(r => r.result_status === 'met').length
    const risk    = resultRows.filter(r => r.result_status === 'risk').length
    const breach  = resultRows.filter(r => r.result_status === 'breach').length
    const exempt  = resultRows.filter(r => r.exemption_claimed).length
    const blank   = resultRows.filter(r => r.actual_value == null && !r.exemption_claimed).length

    console.log(`  ${periodStart} → ${periodEnd} [${status.padEnd(8)}]  KPIs: ${dueKpis.length.toString().padStart(3)}  met: ${met}  risk: ${risk}  breach: ${breach}  exempt: ${exempt}  blank: ${blank}`)

    ;[year, month] = addMonth(year, month)
  }

  console.log('\n✓ Done\n')
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
