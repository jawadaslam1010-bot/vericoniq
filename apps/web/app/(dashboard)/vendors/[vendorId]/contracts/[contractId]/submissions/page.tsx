export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, contracts, submissionPeriods, kpiResults, kpis } from '@contractly/db/schema'
import { eq, and, count, sql } from '@contractly/db'
import { PageTitle } from '@/components/shared/page-title'
import { StatusBadge } from '@/components/ui/status-badge'
import { NewPeriodButton } from '@/components/submissions/NewPeriodButton'
import { SendPortalLinkButton } from '@/components/submissions/SendPortalLinkButton'
import { Plus, ClipboardList } from 'lucide-react'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function periodStatusBadge(status: string): { status: 'met' | 'risk' | 'breach' | 'stale' | 'info', label: string } {
  switch (status) {
    case 'open':       return { status: 'info', label: 'Open' }
    case 'submitted':  return { status: 'risk', label: 'Submitted' }
    case 'reviewing':  return { status: 'risk', label: 'In Review' }
    case 'locked':     return { status: 'met', label: 'Locked' }
    default:           return { status: 'stale', label: status }
  }
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ vendorId: string; contractId: string }>
}) {
  const { vendorId, contractId } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const [contract] = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.orgId, userRecord.orgId)))
    .limit(1)
  if (!contract) notFound()

  // Count active KPIs
  const [{ value: activeKpiCount }] = await db
    .select({ value: count() })
    .from(kpis)
    .where(and(eq(kpis.contractId, contractId), eq(kpis.isActive, true)))

  // Get all periods with result counts
  const periods = await db
    .select()
    .from(submissionPeriods)
    .where(and(
      eq(submissionPeriods.contractId, contractId),
      eq(submissionPeriods.orgId, userRecord.orgId)
    ))
    .orderBy(submissionPeriods.periodStart)

  // Get entered result counts per period
  const resultCounts = await db
    .select({
      periodId: kpiResults.periodId,
      total: count(),
      entered: sql<number>`count(case when ${kpiResults.actualValue} is not null or ${kpiResults.exemptionClaimed} = true then 1 end)`,
      breaches: sql<number>`count(case when ${kpiResults.resultStatus} = 'breach' then 1 end)`,
    })
    .from(kpiResults)
    .where(eq(kpiResults.contractId, contractId))
    .groupBy(kpiResults.periodId)

  const countMap = Object.fromEntries(resultCounts.map(r => [r.periodId, r]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <PageTitle>{contract.name}</PageTitle>
          <p className="text-sm text-muted mt-1">Submission periods · {Number(activeKpiCount)} active KPIs</p>
        </div>
        <NewPeriodButton contractId={contractId} vendorId={vendorId} />
      </div>

      {periods.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No submission periods yet</p>
          <p className="text-sm text-muted mt-1 mb-5">
            Create a period to start entering KPI results for this contract.
          </p>
          <NewPeriodButton contractId={contractId} vendorId={vendorId} label="Create first period" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-header-cell">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Period</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Due date</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Results entered</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Breaches</th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {periods.map(period => {
                const counts = countMap[period.id]
                const entered = Number(counts?.entered ?? 0)
                const total = Number(counts?.total ?? Number(activeKpiCount))
                const breaches = Number(counts?.breaches ?? 0)
                const badge = periodStatusBadge(period.status)

                return (
                  <tr key={period.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">
                      {fmtDate(period.periodStart)} – {fmtDate(period.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{fmtDate(period.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={badge.status} label={badge.label} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span className={entered === total ? 'text-primary font-medium' : ''}>
                        {entered} / {total}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {breaches > 0 ? (
                        <span className="text-status-breach-text font-medium">{breaches}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {period.status !== 'locked' && (
                        <SendPortalLinkButton
                          periodId={period.id}
                          appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/vendors/${vendorId}/contracts/${contractId}/submissions/${period.id}`}
                        className="text-primary hover:text-primary-hover font-medium text-[13px] transition-colors"
                      >
                        {period.status === 'locked' ? 'View' : 'Enter results'} →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
