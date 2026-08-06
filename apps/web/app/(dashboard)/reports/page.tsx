export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull, inArray } from '@contractly/db'
import { users, vendors, contracts, kpiResults, submissionPeriods } from '@contractly/db/schema'
import { PageTitle } from '@/components/shared/page-title'
import { getClaimableCredits } from '@/lib/credits'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports · VericonIQ' }

function fmtMoney(n: number): string {
  if (n <= 0) return '—'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')
  const orgId = userRecord.orgId

  const [allVendors, allContracts] = await Promise.all([
    db.select().from(vendors).where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt))),
    db.select().from(contracts).where(eq(contracts.orgId, orgId)),
  ])

  const activeVendors = allVendors.filter(v => v.status === 'active')

  // Per-vendor rollup
  const reportRows = await Promise.all(activeVendors.map(async v => {
    const vendorContracts = allContracts.filter(c => c.vendorId === v.id && c.status === 'active')
    const contractIds = vendorContracts.map(c => c.id)

    let breaches = 0
    if (contractIds.length > 0) {
      const rows = await db
        .select({ exemptionStatus: kpiResults.exemptionStatus })
        .from(kpiResults)
        .innerJoin(submissionPeriods, eq(kpiResults.periodId, submissionPeriods.id))
        .where(and(
          eq(kpiResults.orgId, orgId),
          inArray(kpiResults.contractId, contractIds),
          eq(kpiResults.resultStatus, 'breach'),
          eq(submissionPeriods.status, 'locked'),
        ))
      breaches = rows.filter(r => r.exemptionStatus !== 'approved').length
    }

    const { total: credits } = await getClaimableCredits({ orgId, contractIds })

    const annualValue = vendorContracts.reduce((s, c) => s + parseFloat(c.annualValue ?? '0'), 0)
    const nextDeadline = vendorContracts
      .map(c => c.noticeDeadline ?? c.endDate)
      .filter(Boolean)
      .sort()[0] ?? null

    return {
      id: v.id,
      name: v.name,
      health: v.healthScore != null ? Math.round(parseFloat(v.healthScore)) : null,
      contracts: vendorContracts.length,
      annualValue,
      breaches,
      credits,
      nextDeadline,
    }
  }))

  const totals = {
    annualValue: reportRows.reduce((s, r) => s + r.annualValue, 0),
    breaches: reportRows.reduce((s, r) => s + r.breaches, 0),
    credits: reportRows.reduce((s, r) => s + r.credits, 0),
  }

  return (
    <div>
      <PageTitle subtitle={`Portfolio report · ${activeVendors.length} active vendor${activeVendors.length !== 1 ? 's' : ''} · ${fmtMoney(totals.annualValue)} annual value under management`}>
        Reports
      </PageTitle>

      {reportRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <BarChart2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-[15px] font-semibold text-ink">Nothing to report yet</h3>
          <p className="text-[13px] text-muted mt-1.5 max-w-sm">
            Add vendors and contracts, and this becomes your executive portfolio summary.
          </p>
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 border border-border rounded-lg bg-surface overflow-hidden">
            {[
              { label: 'Annual value', value: fmtMoney(totals.annualValue) },
              { label: 'Active vendors', value: String(activeVendors.length) },
              { label: 'Open breaches', value: String(totals.breaches) },
              { label: 'Credits claimable', value: totals.credits > 0 ? fmtMoney(totals.credits) : '$0' },
            ].map((t, i) => (
              <div key={t.label} className={`px-5 py-4 ${i < 3 ? 'border-r border-border-soft' : ''}`}>
                <div className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">{t.label}</div>
                <div className="font-serif text-[28px] leading-none mt-1.5 tracking-tight text-ink">{t.value}</div>
              </div>
            ))}
          </div>

          {/* Per-vendor table */}
          <div className="mt-5 rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border-soft bg-header-cell">
                  {['Vendor', 'Health', 'Contracts', 'Annual value', 'Breaches', 'Est. credits', 'Next deadline'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-eyebrow text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {reportRows.map(r => (
                  <tr key={r.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link href={`/vendors/${r.id}/scorecard`} className="hover:text-primary transition-colors">{r.name}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {r.health != null ? (
                        <span className={
                          r.health >= 80 ? 'text-status-met-text font-semibold'
                          : r.health >= 60 ? 'text-status-risk-text font-semibold'
                          : 'text-status-breach-text font-semibold'
                        }>{r.health}%</span>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.contracts}</td>
                    <td className="px-4 py-3 text-ink-soft">{fmtMoney(r.annualValue)}</td>
                    <td className="px-4 py-3">
                      {r.breaches > 0
                        ? <span className="text-status-breach-text font-semibold">{r.breaches}</span>
                        : <span className="text-faint">0</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.credits > 0 ? fmtMoney(r.credits) : '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{fmtDate(r.nextDeadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-faint">
            Health from the latest locked period per vendor. Credit estimates computed from contract terms — confirm before claiming.
          </p>
        </>
      )}
    </div>
  )
}
