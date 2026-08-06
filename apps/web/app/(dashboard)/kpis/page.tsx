export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull } from '@contractly/db'
import { users, kpis, contracts, vendors } from '@contractly/db/schema'
import { PageTitle } from '@/components/shared/page-title'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'KPIs & SLA · VericonIQ' }

const OP_LABEL: Record<string, string> = { gte: '≥', lte: '≤', eq: '=', between: 'between' }

export default async function KpisPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const rows = await db
    .select({
      kpi: kpis,
      contractName: contracts.name,
      contractId: contracts.id,
      vendorName: vendors.name,
      vendorId: vendors.id,
    })
    .from(kpis)
    .innerJoin(contracts, eq(kpis.contractId, contracts.id))
    .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
    .where(and(eq(kpis.orgId, userRecord.orgId), isNull(vendors.deletedAt)))

  const active = rows.filter(r => r.kpi.isActive)
  const pending = rows.filter(r => !r.kpi.isActive)

  return (
    <div>
      <PageTitle
        subtitle={`${active.length} active KPI${active.length !== 1 ? 's' : ''} across your portfolio${pending.length > 0 ? ` · ${pending.length} awaiting review` : ''}`}
      >
        KPIs &amp; SLA
      </PageTitle>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-[15px] font-semibold text-ink">No KPIs yet</h3>
          <p className="text-[13px] text-muted mt-1.5 max-w-sm">
            Upload a contract and run AI extraction — every KPI, target and credit formula is pulled out automatically.
          </p>
          <Link href="/vendors" className="mt-4 text-[13px] font-medium text-primary hover:underline">
            Go to vendors →
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-soft bg-header-cell">
                {['KPI', 'Vendor', 'Contract', 'Target', 'Cadence', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-eyebrow text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {[...active, ...pending].map(({ kpi, contractName, contractId, vendorName, vendorId }) => (
                <tr key={kpi.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-ink max-w-[280px] truncate">{kpi.name}</td>
                  <td className="px-4 py-3 text-muted">
                    <Link href={`/vendors/${vendorId}`} className="hover:text-primary transition-colors">{vendorName}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted max-w-[220px] truncate">
                    <Link href={`/vendors/${vendorId}/contracts/${contractId}/kpis`} className="hover:text-primary transition-colors">{contractName}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {kpi.resultType === 'binary'
                      ? 'Met / not met'
                      : kpi.targetValue != null
                      ? `${OP_LABEL[kpi.targetOperator] ?? kpi.targetOperator} ${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted capitalize">{kpi.cadence}</td>
                  <td className="px-4 py-3">
                    {kpi.isActive ? (
                      <span className="inline-flex rounded-full bg-status-met-bg px-2 py-0.5 text-[11px] font-semibold text-status-met-text">Active</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-status-risk-bg px-2 py-0.5 text-[11px] font-semibold text-status-risk-text">Review</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
