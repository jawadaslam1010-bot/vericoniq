export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull } from '@contractly/db'
import { vendors, users, contracts } from '@contractly/db/schema'
import { FileText, BarChart2, ClipboardList, AlertTriangle, Files, Activity, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorId: string }>
}): Promise<Metadata> {
  const { vendorId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { title: 'Vendor' }
  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) return { title: 'Vendor' }
  const [vendor] = await db.select().from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt))).limit(1)
  return { title: vendor?.name ?? 'Vendor' }
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtValue(n: number | null | undefined) {
  if (!n || n === 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  telco: 'Telecommunications', it: 'IT Services', cloud: 'Cloud Services',
  facilities: 'Facilities Management', security: 'Security',
  construction: 'Construction', supply: 'Supply Chain', property: 'Property', custom: 'Other',
}

export default async function VendorOverviewPage({
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

  const [vendor] = await db.select().from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.orgId, userRecord.orgId), isNull(vendors.deletedAt)))
    .limit(1)
  if (!vendor) notFound()

  const vendorContracts = await db.select().from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))
    .limit(10)

  const activeContracts = vendorContracts.filter(c => c.status === 'active')

  // Quick-nav items
  const quickNav = [
    { id: 'contracts',   label: 'Contracts',   icon: FileText,      desc: `${activeContracts.length} active` },
    { id: 'kpis',        label: 'KPIs',         icon: BarChart2,     desc: 'Performance register' },
    { id: 'scorecard',   label: 'Scorecard',    icon: ClipboardList, desc: 'Weighted health score' },
    { id: 'submissions', label: 'Submissions',  icon: Files,         desc: 'Reporting history' },
    { id: 'breaches',    label: 'Breaches',     icon: AlertTriangle, desc: 'Open SLA breaches' },
    { id: 'activity',    label: 'Activity',     icon: Activity,      desc: 'Audit log' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

      {/* Left column */}
      <div className="space-y-5">

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickNav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={`/vendors/${vendorId}/${item.id}`}
                className="group flex items-center gap-3 p-4 bg-surface border border-border rounded-lg hover:bg-hover hover:border-primary/20 transition-colors duration-180"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink">{item.label}</div>
                  <div className="text-[11.5px] text-muted truncate">{item.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-faint ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )
          })}
        </div>

        {/* Recent contracts */}
        {vendorContracts.length > 0 && (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
              <h3 className="text-sm font-semibold text-ink">Contracts</h3>
              <Link href={`/vendors/${vendorId}/contracts`} className="text-[12px] font-medium text-primary hover:underline">
                View all →
              </Link>
            </div>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-header-cell">
                  {['Contract', 'Status', 'Value', 'Ends'].map((h, i) => (
                    <th key={i} className={cn(
                      'px-4 py-2.5 text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted border-b border-border-soft',
                      i > 1 ? 'text-right' : 'text-left'
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorContracts.slice(0, 5).map((c, i) => (
                  <tr key={c.id} className={cn('hover:bg-hover transition-colors', i < Math.min(vendorContracts.length, 5) - 1 ? 'border-b border-border-soft' : '')}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{c.name}</div>
                      {c.contractNumber && (
                        <div className="text-[11px] text-muted font-mono mt-0.5">{c.contractNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={c.status === 'active' ? 'met' : c.status === 'expired' ? 'stale' : 'breach'}
                        label={c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft tabular-nums">
                      {fmtValue(parseFloat(c.annualValue ?? '0'))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {fmtDate(c.endDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right column — vendor details */}
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Vendor details</h3>
          <dl className="space-y-3">
            {[
              { label: 'Sector',            value: SERVICE_TYPE_LABELS[vendor.serviceType] ?? vendor.serviceType },
              { label: 'ABN',               value: vendor.abn ?? '—' },
              { label: 'Status',            value: vendor.status,     capitalize: true },
              { label: 'Contact name',      value: vendor.contactName ?? '—' },
              { label: 'Contact email',     value: vendor.contactEmail, email: true },
              { label: 'Submission email',  value: vendor.submissionEmail ?? '—' },
              { label: 'Submission method', value: vendor.submissionMethod, capitalize: true },
              { label: 'Added',             value: fmtDate(vendor.createdAt) },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <dt className="text-[12px] text-muted shrink-0">{row.label}</dt>
                <dd className={cn(
                  'text-[12.5px] text-right',
                  row.capitalize ? 'capitalize text-ink' : 'text-ink-soft'
                )}>
                  {row.email && row.value ? (
                    <a href={`mailto:${row.value}`} className="text-primary hover:underline">
                      {row.value}
                    </a>
                  ) : (
                    row.value ?? '—'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
