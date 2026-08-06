export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, contracts, submissionPeriods } from '@contractly/db/schema'
import { eq, and, desc } from '@contractly/db'
import Link from 'next/link'
import { Files, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function periodStatusBadge(status: string): { status: 'met' | 'risk' | 'breach' | 'stale' | 'info'; label: string } {
  switch (status) {
    case 'open':      return { status: 'info', label: 'Open' }
    case 'submitted': return { status: 'risk', label: 'Submitted' }
    case 'reviewing': return { status: 'risk', label: 'In Review' }
    case 'locked':    return { status: 'met', label: 'Locked' }
    default:          return { status: 'stale', label: status }
  }
}

export default async function VendorSubmissionsPage({
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

  // Get all contracts for this vendor
  const vendorContracts = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))

  // Get recent periods across all contracts
  const contractIds = vendorContracts.map(c => c.id)

  const periods = contractIds.length > 0
    ? await db
        .select({ period: submissionPeriods, contract: contracts })
        .from(submissionPeriods)
        .innerJoin(contracts, eq(submissionPeriods.contractId, contracts.id))
        .where(eq(submissionPeriods.orgId, userRecord.orgId))
        .orderBy(desc(submissionPeriods.periodStart))
        .limit(20)
    : []

  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Files className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-[15px] font-semibold text-ink">No submission periods yet</h3>
        <p className="text-[13px] text-muted mt-1.5 max-w-sm">
          Go to a contract to create submission periods and enter KPI results.
        </p>
        <Link
          href={`/vendors/${vendorId}/contracts`}
          className="mt-4 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
        >
          View contracts →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Submission periods</h2>
        <p className="text-sm text-muted mt-0.5">All reporting periods across this vendor's contracts</p>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-header-cell">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Contract</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Period</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Due</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {periods.map(({ period, contract }) => {
              const badge = periodStatusBadge(period.status)
              return (
                <tr key={period.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{contract.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {fmtDate(period.periodStart)} – {fmtDate(period.periodEnd)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(period.dueDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={badge.status} label={badge.label} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/vendors/${vendorId}/contracts/${contract.id}/submissions/${period.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-medium text-[13px] transition-colors"
                    >
                      {period.status === 'locked' ? 'View' : 'Enter results'}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
