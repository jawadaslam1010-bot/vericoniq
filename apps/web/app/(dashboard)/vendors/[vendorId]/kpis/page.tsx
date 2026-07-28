export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, vendors, contracts, kpis } from '@contractly/db/schema'
import { eq, and, asc, isNull } from '@contractly/db'
import { cn } from '@/lib/utils'

function fmtTarget(kpi: {
  targetOperator: string
  targetValue: string | null
  targetValueMax: string | null
  unitLabel: string | null
  unit: string | null
}) {
  const unit = kpi.unitLabel ?? kpi.unit ?? ''
  const suffix = unit ? ` ${unit}` : ''
  switch (kpi.targetOperator) {
    case 'gte':     return `≥ ${kpi.targetValue ?? ''}${suffix}`
    case 'lte':     return `≤ ${kpi.targetValue ?? ''}${suffix}`
    case 'eq':      return `= ${kpi.targetValue ?? ''}${suffix}`
    case 'between': return `${kpi.targetValue ?? ''} – ${kpi.targetValueMax ?? ''}${suffix}`
    default:        return kpi.targetValue ?? '—'
  }
}

export default async function VendorKpisPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))
    .limit(1)
  if (!vendor) notFound()

  // All contracts for this vendor
  const vendorContracts = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))
    .orderBy(asc(contracts.name))

  // All active KPIs across those contracts
  const contractIds = vendorContracts.map(c => c.id)
  const allKpis = contractIds.length > 0
    ? await db
        .select()
        .from(kpis)
        .where(and(eq(kpis.orgId, userRecord.orgId), eq(kpis.isActive, true)))
        .orderBy(asc(kpis.kpiType), asc(kpis.name))
    : []

  // Group KPIs by contractId
  const kpisByContract = new Map<string, typeof allKpis>()
  for (const kpi of allKpis) {
    if (!contractIds.includes(kpi.contractId)) continue
    if (!kpisByContract.has(kpi.contractId)) kpisByContract.set(kpi.contractId, [])
    kpisByContract.get(kpi.contractId)!.push(kpi)
  }

  const totalKpis = allKpis.filter(k => contractIds.includes(k.contractId)).length
  const contractualKpis = allKpis.filter(k => contractIds.includes(k.contractId) && k.kpiType === 'contractual').length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">KPI Register</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {totalKpis} KPI{totalKpis !== 1 ? 's' : ''} across {vendorContracts.length} contract{vendorContracts.length !== 1 ? 's' : ''}
            {contractualKpis > 0 && ` · ${contractualKpis} contractual`}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {totalKpis === 0 && (
        <div className="bg-surface border border-border rounded-lg p-10 text-center">
          <p className="text-[13px] font-medium text-ink">No active KPIs yet</p>
          <p className="text-[12.5px] text-muted mt-1">
            Upload a contract, run AI extraction, then confirm and activate KPIs to see them here.
          </p>
          {vendorContracts.length > 0 && (
            <Link
              href={`/vendors/${vendorId}/contracts`}
              className="inline-block mt-4 text-[12.5px] font-medium text-primary hover:underline"
            >
              Go to contracts →
            </Link>
          )}
        </div>
      )}

      {/* KPIs grouped by contract */}
      {vendorContracts.map(contract => {
        const contractKpis = kpisByContract.get(contract.id) ?? []
        if (contractKpis.length === 0) return null

        const contractual = contractKpis.filter(k => k.kpiType === 'contractual')
        const operational = contractKpis.filter(k => k.kpiType === 'operational')

        return (
          <div key={contract.id} className="bg-surface border border-border rounded-lg overflow-hidden">

            {/* Contract header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft bg-header-cell">
              <div>
                <span className="text-[13px] font-semibold text-ink">{contract.name}</span>
                {contract.contractNumber && (
                  <span className="ml-2 text-[11px] font-mono text-muted">{contract.contractNumber}</span>
                )}
              </div>
              <Link
                href={`/vendors/${vendorId}/contracts/${contract.id}/kpis`}
                className="text-[12px] font-medium text-primary hover:underline shrink-0"
              >
                View register →
              </Link>
            </div>

            {/* KPI table */}
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-border-soft">
                  {['KPI', 'Type', 'Target', 'Cadence', 'Credit formula'].map((h, i) => (
                    <th key={h} className={cn(
                      'px-4 py-2 text-[10.5px] font-bold tracking-eyebrow uppercase text-muted',
                      i === 0 ? 'text-left' : i <= 2 ? 'text-left' : 'text-left'
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractKpis.map((kpi, i) => (
                  <tr
                    key={kpi.id}
                    className={cn(
                      'hover:bg-hover transition-colors',
                      i < contractKpis.length - 1 ? 'border-b border-border-soft' : ''
                    )}
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="font-medium text-ink truncate">{kpi.name}</div>
                      {kpi.clauseRef && (
                        <div className="text-[11px] text-faint italic mt-0.5 truncate">{kpi.clauseRef}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        kpi.kpiType === 'contractual'
                          ? 'bg-status-info-bg text-status-info-text'
                          : 'bg-status-stale-bg text-status-stale-text'
                      )}>
                        {kpi.kpiType === 'contractual' ? 'Contractual' : 'Operational'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft tabular-nums">
                      {fmtTarget(kpi)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-muted capitalize">
                        {kpi.cadence}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted max-w-[200px]">
                      {kpi.creditFormula
                        ? <span className="truncate block" title={kpi.creditFormula}>
                            {kpi.creditFormula.length > 45 ? kpi.creditFormula.slice(0, 45) + '…' : kpi.creditFormula}
                          </span>
                        : <span className="text-faint">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Count footer */}
            <div className="px-5 py-2.5 border-t border-border-soft bg-header-cell/50 flex items-center gap-3 text-[11.5px] text-muted">
              <span>{contractKpis.length} KPI{contractKpis.length !== 1 ? 's' : ''}</span>
              {contractual.length > 0 && <span>· {contractual.length} contractual</span>}
              {operational.length > 0 && <span>· {operational.length} operational</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
