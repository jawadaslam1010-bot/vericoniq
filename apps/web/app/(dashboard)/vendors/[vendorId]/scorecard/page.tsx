export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, asc } from '@contractly/db'
import { users, vendors, contracts, kpis, submissionPeriods, kpiResults } from '@contractly/db/schema'
import { HealthTrendChart, OutcomeStackChart, TopBreachersTable } from '@/components/scorecard/ScorecardCharts'
import type { PeriodStat, TopBreacher } from '@/components/scorecard/ScorecardCharts'
import { ScorecardFilter } from '@/components/scorecard/ScorecardFilter'
import type { PeriodFilter } from '@/components/scorecard/ScorecardFilter'
import { StatusBadge } from '@/components/ui/status-badge'

function fmtMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

function healthScore(met: number, risk: number, total: number, exempt: number): number {
  const denominator = total - exempt
  if (denominator <= 0) return 100
  return Math.round(((met + risk) / denominator) * 1000) / 10
}

function scoreStatus(score: number): 'met' | 'risk' | 'breach' {
  if (score >= 85) return 'met'
  if (score >= 70) return 'risk'
  return 'breach'
}

function filterLabel(f: PeriodFilter): string {
  switch (f) {
    case 'month':   return 'This month'
    case 'quarter': return 'Last 3 months'
    case 'year':    return 'Last 12 months'
    case 'all':     return 'All time'
  }
}

function slicePeriods<T>(periods: T[], filter: PeriodFilter): T[] {
  if (filter === 'all')     return periods
  if (filter === 'year')    return periods.slice(-12)
  if (filter === 'quarter') return periods.slice(-3)
  if (filter === 'month')   return periods.slice(-1)
  return periods
}

export default async function ScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorId: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { vendorId } = await params
  const { period } = await searchParams
  const activeFilter: PeriodFilter =
    period === 'month' || period === 'quarter' || period === 'year' ? period : 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId)))
    .limit(1)
  if (!vendor) notFound()

  // All contracts for this vendor
  const vendorContracts = await db
    .select({ id: contracts.id, name: contracts.name })
    .from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))

  if (vendorContracts.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-[13px] text-muted">No contracts found for this vendor.</p>
      </div>
    )
  }

  const contractIds = vendorContracts.map(c => c.id)

  // All locked/submitted periods across all contracts, ordered by start date
  const periods = await db
    .select()
    .from(submissionPeriods)
    .where(and(
      eq(submissionPeriods.orgId, userRecord.orgId),
    ))
    .orderBy(asc(submissionPeriods.periodStart))
    .then(rows => rows.filter(p =>
      contractIds.includes(p.contractId) &&
      (p.status === 'locked' || p.status === 'submitted' || p.status === 'reviewing')
    ))

  if (periods.length === 0) {
    return (
      <div className="py-20 text-center space-y-2">
        <p className="text-[14px] font-medium text-ink">No completed periods yet</p>
        <p className="text-[13px] text-muted">Scorecard data will appear once submission periods have been locked.</p>
      </div>
    )
  }

  // All results for these periods
  const periodIds = periods.map(p => p.id)
  const allResults = await db
    .select({
      periodId: kpiResults.periodId,
      kpiId: kpiResults.kpiId,
      resultStatus: kpiResults.resultStatus,
      exemptionStatus: kpiResults.exemptionStatus,
    })
    .from(kpiResults)
    .where(eq(kpiResults.orgId, userRecord.orgId))
    .then(rows => rows.filter(r => periodIds.includes(r.periodId)))

  // All active KPIs for these contracts
  const activeKpisWithContract = await db
    .select({ id: kpis.id, name: kpis.name, kpiType: kpis.kpiType, contractId: kpis.contractId })
    .from(kpis)
    .where(and(eq(kpis.orgId, userRecord.orgId), eq(kpis.isActive, true)))
    .then(rows => rows.filter(k => contractIds.includes(k.contractId)))

  const kpiMap = new Map(activeKpisWithContract.map(k => [k.id, k]))

  // ── Build per-period stats ─────────────────────────────────────────────────

  const periodStats: PeriodStat[] = periods.map(period => {
    const results = allResults.filter(r => r.periodId === period.id)
    const total   = results.length
    const met     = results.filter(r => r.resultStatus === 'met').length
    const risk    = results.filter(r => r.resultStatus === 'risk').length
    const breach  = results.filter(r => r.resultStatus === 'breach').length
    const exempt  = results.filter(r =>
      r.exemptionStatus === 'approved' || r.resultStatus === 'exempt'
    ).length

    return {
      label: fmtMonth(period.periodStart),
      healthScore: healthScore(met, risk, total, exempt),
      met, risk, breach, exempt, total,
    }
  })

  // ── Apply time filter ──────────────────────────────────────────────────────

  const filteredPeriodStats = slicePeriods(periodStats, activeFilter)
  const filteredPeriodIds = new Set(
    slicePeriods(periods, activeFilter).map(p => p.id)
  )

  // ── Overall / latest stats ─────────────────────────────────────────────────

  const latest = filteredPeriodStats[filteredPeriodStats.length - 1]
  const allLockedResults = allResults.filter(r =>
    filteredPeriodIds.has(r.periodId)
  )
  const totalResults  = allLockedResults.length
  const totalMet      = allLockedResults.filter(r => r.resultStatus === 'met').length
  const totalRisk     = allLockedResults.filter(r => r.resultStatus === 'risk').length
  const totalBreach   = allLockedResults.filter(r => r.resultStatus === 'breach').length
  const totalExempt   = allLockedResults.filter(r => r.exemptionStatus === 'approved' || r.resultStatus === 'exempt').length
  const overallScore  = healthScore(totalMet, totalRisk, totalResults, totalExempt)

  // ── Top breaching KPIs ────────────────────────────────────────────────────

  const breachCounts = new Map<string, number>()
  const periodCounts = new Map<string, number>()
  for (const r of allLockedResults) {
    if (!kpiMap.has(r.kpiId)) continue
    periodCounts.set(r.kpiId, (periodCounts.get(r.kpiId) ?? 0) + 1)
    if (r.resultStatus === 'breach') {
      breachCounts.set(r.kpiId, (breachCounts.get(r.kpiId) ?? 0) + 1)
    }
  }

  const topBreachers: TopBreacher[] = Array.from(breachCounts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kpiId, breaches]) => {
      const kpi = kpiMap.get(kpiId)!
      return {
        name: kpi.name,
        breaches,
        total: periodCounts.get(kpiId) ?? 0,
        kpiType: kpi.kpiType,
      }
    })

  const latestStatus = scoreStatus(latest?.healthScore ?? 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Scorecard</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {filterLabel(activeFilter)} · {filteredPeriodStats.length} period{filteredPeriodStats.length !== 1 ? 's' : ''} · {activeKpisWithContract.length} active KPI{activeKpisWithContract.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <ScorecardFilter current={activeFilter} />
          </Suspense>
          {latest && (
            <StatusBadge
              status={latestStatus === 'met' ? 'met' : latestStatus === 'risk' ? 'risk' : 'breach'}
              label={`Latest ${latest.healthScore}%`}
            />
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall health',  value: `${overallScore}%`,   highlight: true },
          { label: 'Total results',   value: totalResults.toLocaleString() },
          { label: 'Total breaches',  value: totalBreach.toLocaleString(), danger: totalBreach > 0 },
          { label: 'Periods tracked', value: periods.length.toString() },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${
              s.danger ? 'text-status-breach-text' :
              s.highlight ? 'text-primary' :
              'text-ink'
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Health trend */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-4">Health score trend</h3>
          <HealthTrendChart data={filteredPeriodStats} />
        </div>

        {/* Outcome stacked bar */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-ink mb-4">KPI outcomes by period</h3>
          <OutcomeStackChart data={filteredPeriodStats} />
        </div>
      </div>

      {/* Period breakdown table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[13px] font-semibold text-ink">Period breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-header-cell">
              <tr>
                {['Period', 'Health', 'Met', 'At risk', 'Breach', 'Exempt', 'Total'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {filteredPeriodStats.map((p, i) => {
                const st = scoreStatus(p.healthScore)
                return (
                  <tr key={i} className="hover:bg-hover">
                    <td className="px-4 py-2.5 text-[13px] font-medium text-ink">{p.label}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[13px] font-semibold ${
                        st === 'met' ? 'text-status-met-text' :
                        st === 'risk' ? 'text-status-risk-text' :
                        'text-status-breach-text'
                      }`}>{p.healthScore}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-status-met-text font-medium">{p.met}</td>
                    <td className="px-4 py-2.5 text-[13px] text-status-risk-text font-medium">{p.risk}</td>
                    <td className="px-4 py-2.5 text-[13px] text-status-breach-text font-medium">{p.breach}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">{p.exempt}</td>
                    <td className="px-4 py-2.5 text-[13px] text-muted">{p.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top breaching KPIs */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-semibold text-ink mb-3">Top breaching KPIs</h3>
        <TopBreachersTable data={topBreachers} />
      </div>

    </div>
  )
}
