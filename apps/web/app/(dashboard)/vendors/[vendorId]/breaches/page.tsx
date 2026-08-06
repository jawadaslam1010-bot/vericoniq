export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull, desc } from '@contractly/db'
import { vendors, users, contracts, kpis, kpiResults, submissionPeriods } from '@contractly/db/schema'
import { computeKpiCredit, contractMrc } from '@/lib/kpi-scoring'

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function BreachesPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))
    .limit(1)
  if (!vendor) notFound()

  // All breached, non-exempt results across this vendor's contracts.
  const rows = await db
    .select({
      result: kpiResults,
      kpi: kpis,
      contract: contracts,
      period: submissionPeriods,
    })
    .from(kpiResults)
    .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
    .innerJoin(contracts, eq(kpiResults.contractId, contracts.id))
    .innerJoin(submissionPeriods, eq(kpiResults.periodId, submissionPeriods.id))
    .where(and(
      eq(kpiResults.orgId, userRecord.orgId),
      eq(contracts.vendorId, vendorId),
      eq(kpiResults.resultStatus, 'breach'),
    ))
    .orderBy(desc(submissionPeriods.periodEnd))

  const breaches = rows
    .filter(r => r.result.exemptionStatus !== 'approved')
    .map(r => ({
      id: r.result.id,
      kpiName: r.kpi.name,
      contractId: r.contract.id,
      contractName: r.contract.name,
      periodLabel: `${fmtDate(r.period.periodStart)} – ${fmtDate(r.period.periodEnd)}`,
      periodStatus: r.period.status,
      actual: r.result.actualValue,
      target: r.kpi.targetValue,
      operator: r.kpi.targetOperator,
      unit: r.kpi.unit,
      credit: computeKpiCredit({
        kpi: r.kpi,
        resultStatus: 'breach',
        actualValue: r.result.actualValue,
        mrc: contractMrc(r.contract),
      }),
      pending: r.result.exemptionStatus === 'pending',
    }))

  const totalCredit = breaches.reduce((s, b) => s + b.credit, 0)

  if (breaches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-status-met-bg flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-status-met-text" />
        </div>
        <h3 className="text-[15px] font-semibold text-ink">No open breaches</h3>
        <p className="text-[13px] text-muted mt-1.5 max-w-sm">
          Every KPI result for this vendor is meeting its target, exempt, or not yet entered.
        </p>
      </div>
    )
  }

  const opLabel: Record<string, string> = { gte: '≥', lte: '≤', eq: '=', between: 'between' }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-border bg-surface px-5 py-3">
          <div className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">Open breaches</div>
          <div className="font-serif text-[26px] text-status-breach-text mt-0.5">{breaches.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-5 py-3">
          <div className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">Estimated credits</div>
          <div className="font-serif text-[26px] text-ink mt-0.5">{fmtMoney(totalCredit)}</div>
        </div>
      </div>

      {/* Breach table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border-soft bg-header-cell">
              {['KPI', 'Contract', 'Period', 'Result', 'Est. credit', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-eyebrow text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {breaches.map(b => (
              <tr key={b.id} className="hover:bg-hover transition-colors">
                <td className="px-4 py-3 font-medium text-ink">
                  {b.kpiName}
                  {b.pending && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-status-risk-bg px-2 py-0.5 text-[10px] font-semibold text-status-risk-text">
                      Exemption pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  <Link href={`/vendors/${vendorId}/contracts/${b.contractId}`} className="hover:text-primary transition-colors">
                    {b.contractName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{b.periodLabel}</td>
                <td className="px-4 py-3">
                  <span className="text-status-breach-text font-semibold">{b.actual ?? '—'}</span>
                  <span className="text-faint"> vs {opLabel[b.operator] ?? b.operator} {b.target ?? '—'}{b.unit ? ` ${b.unit}` : ''}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{b.credit > 0 ? fmtMoney(b.credit) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/vendors/${vendorId}/contracts/${b.contractId}/submissions`} className="text-[12px] text-primary hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-faint">
        Credit estimates are computed from each KPI&apos;s contract terms. Confirm against the contract before raising a claim.
      </p>
    </div>
  )
}
