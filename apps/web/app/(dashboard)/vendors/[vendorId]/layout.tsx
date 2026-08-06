export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull, desc, inArray } from '@contractly/db'
import { vendors, users, contracts, kpis, submissionPeriods, kpiResults } from '@contractly/db/schema'
import { Upload, Zap } from 'lucide-react'
import { VendorMark } from '@/components/shared/vendor-mark'
import { StatusBadge } from '@/components/ui/status-badge'
import { VendorTabBar } from '@/components/shared/vendor-tab-bar'
import { getClaimableCredits } from '@/lib/credits'
import { cn } from '@/lib/utils'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  telco:        'Telecommunications',
  it:           'IT Services',
  cloud:        'Cloud Services',
  facilities:   'Facilities Management',
  security:     'Security',
  construction: 'Construction',
  supply:       'Supply Chain',
  property:     'Property',
  custom:       'Other',
}

function fmtValue(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

function daysFromNow(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return null
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `${diff} days`
}

const TONE_TEXT: Record<string, string> = {
  met:    'text-status-met-text',
  risk:   'text-status-risk-text',
  breach: 'text-status-breach-text',
  info:   'text-status-info-text',
  stale:  'text-status-stale-text',
}

export default async function VendorDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
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

  // Fetch contracts + kpis for summary strip
  const [vendorContracts, vendorKpis] = await Promise.all([
    db.select().from(contracts).where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId))),
    db.select({ contractId: kpis.contractId, isActive: kpis.isActive }).from(kpis).where(eq(kpis.orgId, userRecord.orgId)),
  ])

  const activeContracts = vendorContracts.filter(c => c.status === 'active')
  const contractIds = new Set(vendorContracts.map(c => c.id))

  // Health score — calculated from the most recent locked period across all vendor contracts
  let healthNum: number | null = null
  const latestLockedPeriod = await db
    .select({ id: submissionPeriods.id, contractId: submissionPeriods.contractId })
    .from(submissionPeriods)
    .where(and(eq(submissionPeriods.orgId, userRecord.orgId), eq(submissionPeriods.status, 'locked')))
    .orderBy(desc(submissionPeriods.periodEnd))
    .then(rows => rows.find(p => contractIds.has(p.contractId)))

  if (latestLockedPeriod) {
    const results = await db
      .select({ resultStatus: kpiResults.resultStatus, exemptionStatus: kpiResults.exemptionStatus })
      .from(kpiResults)
      .where(eq(kpiResults.periodId, latestLockedPeriod.id))

    const total   = results.length
    const met     = results.filter(r => r.resultStatus === 'met').length
    const risk    = results.filter(r => r.resultStatus === 'risk').length
    const exempt  = results.filter(r => r.exemptionStatus === 'approved' || r.resultStatus === 'exempt').length
    const denom   = total - exempt
    if (denom > 0) healthNum = Math.round(((met + risk) / denom) * 1000) / 10
  }

  const healthTone = healthNum == null ? 'stale' : healthNum >= 80 ? 'met' : healthNum >= 60 ? 'risk' : 'breach'

  const totalAnnualValue = activeContracts.reduce((s, c) => s + parseFloat(c.annualValue ?? '0'), 0)

  // Next renewal — prefer noticeDeadline, fall back to endDate
  const nextDeadline = activeContracts
    .map(c => c.noticeDeadline ?? c.endDate)
    .filter(Boolean)
    .sort()[0]
  const daysToRenewal = daysFromNow(nextDeadline)
  const renewalTone = !daysToRenewal ? 'stale'
    : parseInt(daysToRenewal) <= 14 ? 'breach'
    : parseInt(daysToRenewal) <= 30 ? 'risk'
    : 'met'

  // KPI count for this vendor's contracts
  const kpiCount = vendorKpis.filter(k => contractIds.has(k.contractId)).length

  // Claimable service credits across this vendor's contracts (locked-period breaches)
  const { total: creditsClaimable, count: creditsClaims } = await getClaimableCredits({
    orgId: userRecord.orgId,
    contractIds: [...contractIds],
  })

  const pendingExtraction = vendorContracts.filter(c =>
    c.extractionStatus === 'processing' || c.extractionStatus === 'pending'
  ).length

  const summaryStrip = [
    {
      label: 'Health score',
      value: healthNum != null ? `${healthNum}%` : '—',
      sub: healthNum != null
        ? healthNum >= 80 ? 'All KPIs on track'
        : healthNum >= 60 ? 'Some KPIs at risk'
        : 'Attention required'
        : 'No scores yet',
      tone: healthTone,
    },
    {
      label: 'Annual value',
      value: totalAnnualValue > 0 ? fmtValue(totalAnnualValue) : '—',
      sub: `${activeContracts.length} active contract${activeContracts.length !== 1 ? 's' : ''}`,
      tone: 'info' as const,
    },
    {
      label: 'Next renewal',
      value: daysToRenewal ?? '—',
      sub: nextDeadline
        ? `Notice ${new Date(nextDeadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'No upcoming renewals',
      tone: renewalTone,
    },
    {
      label: 'Credits claimable',
      value: creditsClaimable > 0 ? fmtValue(creditsClaimable) : '$0',
      sub: creditsClaimable > 0
        ? `Across ${creditsClaims} breached KPI${creditsClaims !== 1 ? 's' : ''}`
        : 'No open claims',
      tone: creditsClaimable > 0 ? ('breach' as const) : ('stale' as const),
    },
  ]

  // Tab counts — open (non-exempt) breaches across this vendor's contracts
  const contractIdArr = [...contractIds]
  let breachCount = 0
  if (contractIdArr.length > 0) {
    const breachRows = await db
      .select({ exemptionStatus: kpiResults.exemptionStatus })
      .from(kpiResults)
      .where(and(
        eq(kpiResults.orgId, userRecord.orgId),
        inArray(kpiResults.contractId, contractIdArr),
        eq(kpiResults.resultStatus, 'breach'),
      ))
    breachCount = breachRows.filter(r => r.exemptionStatus !== 'approved').length
  }
  const tabItems = [
    { id: 'overview',     label: 'Overview',     href: `/vendors/${vendorId}` },
    { id: 'contracts',    label: 'Contracts',    href: `/vendors/${vendorId}/contracts`,    count: activeContracts.length },
    { id: 'kpis',         label: 'KPIs',         href: `/vendors/${vendorId}/kpis`,         count: kpiCount },
    { id: 'scorecard',    label: 'Scorecard',    href: `/vendors/${vendorId}/scorecard` },
    { id: 'submissions',  label: 'Submissions',  href: `/vendors/${vendorId}/submissions` },
    { id: 'breaches',     label: 'Breaches',     href: `/vendors/${vendorId}/breaches`,     count: breachCount },
    { id: 'documents',    label: 'Documents',    href: `/vendors/${vendorId}/documents` },
    { id: 'activity',     label: 'Activity',     href: `/vendors/${vendorId}/activity` },
  ]

  return (
    <div>
      {/* ── Vendor header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          <VendorMark name={vendor.name} id={vendor.id} size={56} radius={12} />
          <div>
            <h1 className="font-serif text-[30px] font-normal leading-tight text-ink tracking-tight">
              {vendor.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[13px] text-muted">
              <span>{SERVICE_TYPE_LABELS[vendor.serviceType] ?? vendor.serviceType}</span>
              {vendor.abn && (
                <>
                  <span className="text-faint">·</span>
                  <span>ABN {vendor.abn}</span>
                </>
              )}
              <span className="text-faint">·</span>
              <span>{activeContracts.length} contract{activeContracts.length !== 1 ? 's' : ''} · {kpiCount} KPIs</span>
              <StatusBadge
                status={vendor.status === 'active' ? 'met' : vendor.status === 'inactive' ? 'stale' : 'breach'}
                label={vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/vendors/${vendorId}/contracts`}>
            <button className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[13px] font-medium text-ink-soft border border-border bg-surface hover:bg-hover transition-colors duration-180">
              <Upload className="h-[14px] w-[14px]" />
              Upload contract
            </button>
          </Link>
          {pendingExtraction > 0 && (
            <button className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover transition-colors duration-180">
              <Zap className="h-[14px] w-[14px]" />
              Run AI extraction
            </button>
          )}
        </div>
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-lg bg-surface overflow-hidden mb-0">
        {summaryStrip.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'px-5 py-4',
              i < summaryStrip.length - 1 ? 'border-r border-border-soft' : '',
              i >= 2 ? 'border-t border-border-soft md:border-t-0' : ''
            )}
          >
            <div className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">
              {s.label}
            </div>
            <div className={cn('font-serif text-[32px] leading-none mt-1.5 tracking-tight', TONE_TEXT[s.tone])}>
              {s.value}
            </div>
            <div className="text-[12px] text-muted mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <VendorTabBar vendorId={vendorId} tabs={tabItems} />

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="mt-5">
        {children}
      </div>
    </div>
  )
}
