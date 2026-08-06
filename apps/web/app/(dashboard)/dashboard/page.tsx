export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Upload, Plus, Filter, ChevronRight, Zap, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull } from '@contractly/db'
import { vendors, organisations, contracts, kpis } from '@contractly/db/schema'
import { users } from '@contractly/db/schema'
import { PageTitle } from '@/components/shared/page-title'
import { VendorMark } from '@/components/shared/vendor-mark'
import { HealthBar } from '@/components/shared/health-bar'
import { getClaimableCredits } from '@/lib/credits'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard · VericonIQ' }

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtValue(n: number | null | undefined): string {
  if (!n || n === 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysFromNow(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return null
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 30) return `in ${diff}d`
  if (diff <= 90) return `in ${Math.round(diff / 7)}w`
  return `in ${Math.round(diff / 30)}mo`
}

// Tone → Tailwind classes (bg + text)
const TONE_CLASSES: Record<string, string> = {
  met:    'bg-status-met-bg    text-status-met-text',
  risk:   'bg-status-risk-bg   text-status-risk-text',
  breach: 'bg-status-breach-bg text-status-breach-text',
  info:   'bg-status-info-bg   text-status-info-text',
  stale:  'bg-status-stale-bg  text-status-stale-text',
}

// Tone → CSS color variable for inline SVG/number coloring
const DOT_VAR: Record<string, string> = {
  met:    'var(--status-met-dot)',
  risk:   'var(--status-risk-dot)',
  breach: 'var(--status-breach-dot)',
  info:   'var(--status-info-dot)',
  stale:  'var(--status-stale-dot)',
}

// ─── Data component ──────────────────────────────────────────────────────────

async function DashboardData() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const orgId = userRecord.orgId

  // Parallel fetch — everything we need in one round-trip
  const [orgRows, allVendors, allContracts, allKpis] = await Promise.all([
    db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1),
    db.select().from(vendors).where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt))),
    db.select().from(contracts).where(eq(contracts.orgId, orgId)),
    db.select({ contractId: kpis.contractId, isActive: kpis.isActive }).from(kpis).where(eq(kpis.orgId, orgId)),
  ])

  const org = orgRows[0]
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86_400_000)

  // Filter helpers
  const activeVendors = allVendors.filter((v) => v.status === 'active')
  const activeContracts = allContracts.filter((c) => c.status === 'active')

  // ── Action queue counts ────────────────────────────────────────────────────
  const kpiReviewCount = allContracts.filter(
    (c) => c.extractionStatus === 'processing' || c.extractionStatus === 'pending'
  ).length

  const renewalsCount = activeContracts.filter((c) => {
    const deadline = c.noticeDeadline ? new Date(c.noticeDeadline) : null
    return deadline && deadline > now && deadline <= in30
  }).length

  // Breaches and submissions are stubbed — no kpi_results table yet
  const breachCount = 0
  const submissionsCount = activeVendors.filter((v) => v.submissionEmail).length

  // ── Portfolio totals ───────────────────────────────────────────────────────
  const totalAnnualValue = activeContracts.reduce(
    (sum, c) => sum + parseFloat(c.annualValue ?? '0'),
    0
  )

  // Claimable service credits across the whole org (locked-period breaches)
  const { total: creditsClaimable, count: creditsClaims } = await getClaimableCredits({ orgId })

  // ── Health breakdown ───────────────────────────────────────────────────────
  const scoredVendors = activeVendors.filter((v) => v.healthScore != null)
  const avgHealth =
    scoredVendors.length > 0
      ? Math.round(
          scoredVendors.reduce((s, v) => s + parseFloat(v.healthScore!), 0) /
            scoredVendors.length
        )
      : null

  const healthMet    = scoredVendors.filter((v) => parseFloat(v.healthScore!) >= 80).length
  const healthRisk   = scoredVendors.filter((v) => { const s = parseFloat(v.healthScore!); return s >= 60 && s < 80 }).length
  const healthBreach = scoredVendors.filter((v) => parseFloat(v.healthScore!) < 60).length
  const healthStale  = activeVendors.filter((v) => v.healthScore == null).length
  const totalHealthBuckets = healthMet + healthRisk + healthBreach + healthStale

  // ── Per-vendor aggregates for the table ───────────────────────────────────
  const contractsByVendor = new Map<string, typeof allContracts>()
  for (const c of allContracts) {
    const arr = contractsByVendor.get(c.vendorId) ?? []
    arr.push(c)
    contractsByVendor.set(c.vendorId, arr)
  }

  const kpisByContract = new Map<string, number>()
  for (const k of allKpis) {
    kpisByContract.set(k.contractId, (kpisByContract.get(k.contractId) ?? 0) + 1)
  }

  const vendorRows = activeVendors
    .map((v) => {
      const vContracts = contractsByVendor.get(v.id) ?? []
      const activeVContracts = vContracts.filter((c) => c.status === 'active')
      const kpiCount = vContracts.reduce((s, c) => s + (kpisByContract.get(c.id) ?? 0), 0)
      const annualVal = activeVContracts.reduce(
        (s, c) => s + parseFloat(c.annualValue ?? '0'),
        0
      )
      // Earliest upcoming notice deadline or end date
      const nextRenewal = activeVContracts
        .map((c) => c.noticeDeadline ?? c.endDate)
        .filter(Boolean)
        .sort()[0]
      return {
        ...v,
        contractCount: activeVContracts.length,
        kpiCount,
        annualVal,
        nextRenewal,
        healthNum: v.healthScore != null ? parseFloat(v.healthScore) : null,
      }
    })
    .sort((a, b) => {
      // Lowest health first; unscored vendors go to the bottom
      if (a.healthNum == null && b.healthNum == null) return 0
      if (a.healthNum == null) return 1
      if (b.healthNum == null) return -1
      return a.healthNum - b.healthNum
    })

  // ── Synthetic activity feed ────────────────────────────────────────────────
  type ActivityItem = { kind: string; title: string; meta: string; tone: string }
  const activity: ActivityItem[] = []

  // Extraction queue items
  allContracts
    .filter((c) => c.extractionStatus === 'processing' || c.extractionStatus === 'pending')
    .slice(0, 2)
    .forEach((c) =>
      activity.push({
        kind: 'extract',
        title: `AI extracted KPIs from ${c.name}`,
        meta: `Awaiting your review · ${c.contractNumber ?? ''}`,
        tone: 'risk',
      })
    )

  // Upcoming renewals
  activeContracts
    .filter((c) => {
      const d = c.noticeDeadline ? new Date(c.noticeDeadline) : null
      return d && d > now && d <= in30
    })
    .slice(0, 2)
    .forEach((c) =>
      activity.push({
        kind: 'renew',
        title: `${c.name} notice deadline approaching`,
        meta: `Deadline ${fmtDate(c.noticeDeadline)}`,
        tone: 'risk',
      })
    )

  // Recently added contracts
  allContracts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .forEach((c) => {
      const vendorName = allVendors.find((v) => v.id === c.vendorId)?.name ?? ''
      activity.push({
        kind: 'upload',
        title: `${c.name} added`,
        meta: `${fmtDate(c.createdAt)}${vendorName ? ` · ${vendorName}` : ''}`,
        tone: 'info',
      })
    })

  const recentActivity = activity.slice(0, 5)

  // ── Today label ───────────────────────────────────────────────────────────
  const todayLabel = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // ── Action queue items ────────────────────────────────────────────────────
  const actionItems = [
    {
      tag: 'KPI REVIEW',
      n: kpiReviewCount,
      copy: kpiReviewCount > 0
        ? `${kpiReviewCount} contract${kpiReviewCount !== 1 ? 's' : ''} with AI-extracted KPIs awaiting your sign-off`
        : 'All KPI extractions are up to date',
      cta: 'Review →',
      href: '/contracts',
      tone: kpiReviewCount > 0 ? 'risk' : 'met',
    },
    {
      tag: 'RENEWALS',
      n: renewalsCount,
      copy: renewalsCount > 0
        ? `${renewalsCount} contract${renewalsCount !== 1 ? 's' : ''} reaching notice deadline within 30 days`
        : 'No urgent renewals in the next 30 days',
      cta: 'View renewals',
      href: '/contracts',
      tone: renewalsCount > 0 ? 'risk' : 'met',
    },
    {
      tag: 'BREACHES',
      n: breachCount,
      copy: breachCount > 0
        ? 'Active SLA breaches with service credits claimable'
        : 'No active breaches recorded this period',
      cta: 'File claim',
      href: '/kpis',
      tone: breachCount > 0 ? 'breach' : 'met',
    },
    {
      tag: 'SUBMISSIONS',
      n: submissionsCount,
      copy: submissionsCount > 0
        ? `${submissionsCount} vendor${submissionsCount !== 1 ? 's' : ''} configured for performance submissions`
        : 'Configure vendor submission emails to track reporting',
      cta: 'Chase →',
      href: '/vendors',
      tone: 'info' as const,
    },
  ]

  // ── Health rows ───────────────────────────────────────────────────────────
  const healthRows = [
    { label: 'Met',     count: healthMet,    tone: 'met'    },
    { label: 'At risk', count: healthRisk,   tone: 'risk'   },
    { label: 'Breach',  count: healthBreach, tone: 'breach' },
    { label: 'Stale',   count: healthStale,  tone: 'stale'  },
  ]

  // ── Activity icons ────────────────────────────────────────────────────────
  const ACTIVITY_ICON: Record<string, React.ElementType> = {
    extract: Zap,
    breach:  AlertTriangle,
    renew:   Clock,
    upload:  Upload,
    review:  CheckCircle2,
  }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <PageTitle
        eyebrow={`${org?.name ?? 'Your organisation'} · ${todayLabel}`}
        subtitle={`${activeVendors.length} active vendor${activeVendors.length !== 1 ? 's' : ''} · ${activeContracts.length} contracts under management · ${fmtValue(totalAnnualValue)} annual value`}
        actions={
          <>
            <Link href="/contracts/upload">
              <button className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[13px] font-medium text-ink-soft border border-border bg-surface hover:bg-hover transition-colors duration-180">
                <Upload className="h-[14px] w-[14px]" />
                Upload contract
              </button>
            </Link>
            <Link href="/vendors/new">
              <button className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover transition-colors duration-180">
                <Plus className="h-[14px] w-[14px] stroke-[2.2]" />
                Add vendor
              </button>
            </Link>
          </>
        }
      >
        Portfolio overview
      </PageTitle>

      {/* ── Action queue ──────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border-soft">
          <span className="text-[10.5px] font-bold tracking-wider2 uppercase text-primary">
            Needs your attention
          </span>
          <span className="text-[11.5px] text-muted">Updated just now</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border-soft divide-y md:divide-y-0">
          {actionItems.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 p-5">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-serif text-[36px] leading-none font-normal"
                  style={{ color: DOT_VAR[item.tone] }}
                >
                  {item.n}
                </span>
                <span className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">
                  {item.tag}
                </span>
              </div>
              <p className="text-[12.5px] text-ink-soft leading-snug min-h-[36px]">
                {item.copy}
              </p>
              <Link
                href={item.href}
                className="text-[12px] font-semibold text-primary mt-auto hover:underline underline-offset-2"
              >
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Health + Activity ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">

        {/* Portfolio Health */}
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-ink">Portfolio health</h3>
            <p className="text-[12.5px] text-muted mt-1">
              {scoredVendors.length > 0
                ? `Weighted average across ${scoredVendors.length} scored vendor${scoredVendors.length !== 1 ? 's' : ''}`
                : 'No scores yet — add KPI actuals to start tracking'}
            </p>
          </div>

          {avgHealth != null ? (
            <div className="flex items-end gap-8 mb-5">
              <div>
                <div className="font-serif text-[64px] leading-none text-ink tracking-tight">
                  {avgHealth}
                  <span className="text-[28px] text-muted"> / 100</span>
                </div>
                <div
                  className={cn(
                    'text-[12px] font-semibold mt-1.5',
                    avgHealth >= 80 ? 'text-status-met-text' :
                    avgHealth >= 60 ? 'text-status-risk-text' :
                    'text-status-breach-text'
                  )}
                >
                  {avgHealth >= 80 ? '↑ On track' : avgHealth >= 60 ? '⚠ Needs attention' : '↓ Critical — action required'}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {healthRows.map((row) => {
                  const pct = totalHealthBuckets > 0
                    ? Math.round((row.count / totalHealthBuckets) * 100)
                    : 0
                  return (
                    <div key={row.label} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className="w-14 text-ink-soft shrink-0">{row.label}</span>
                      <div className="flex-1 h-2 bg-page rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: DOT_VAR[row.tone] }}
                        />
                      </div>
                      <span className="w-6 text-right font-semibold text-ink tabular-nums">{row.count}</span>
                      <span className="w-8 text-right text-muted text-[11.5px] tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-muted mb-5">
              Health scores appear once you start entering KPI actuals.
            </div>
          )}

          {/* Service credits sub-panel */}
          <div className="p-4 rounded-[10px] bg-page flex items-center justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-bold tracking-eyebrow uppercase text-muted">
                Service credits claimable
              </div>
              <div className="font-serif text-[28px] tracking-tight mt-1">
                {creditsClaimable > 0 ? fmtValue(creditsClaimable) : '$0'}
              </div>
              <div className="text-[11.5px] text-muted mt-0.5">
                {creditsClaimable > 0
                  ? `Across ${creditsClaims} breached KPI${creditsClaims !== 1 ? 's' : ''} in locked periods`
                  : 'No open claims · add KPI results to track'}
              </div>
            </div>
            <button className="shrink-0 h-8 px-3.5 rounded-lg text-[13px] font-medium text-ink-soft border border-border bg-surface hover:bg-hover transition-colors duration-180">
              View claims
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border-soft">
            <h3 className="text-sm font-semibold text-ink">Recent activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted">
              Activity will appear here as you add vendors and contracts.
            </div>
          ) : (
            <div>
              {recentActivity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.kind] ?? Zap
                return (
                  <div
                    key={i}
                    className="flex gap-3 px-5 py-3.5 border-t border-border-soft first:border-t-0"
                  >
                    <div
                      className={cn(
                        'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0',
                        TONE_CLASSES[a.tone]
                      )}
                    >
                      <Icon className="h-[15px] w-[15px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-ink leading-snug">{a.title}</div>
                      <div className="text-[11.5px] text-muted mt-0.5">{a.meta}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Vendors at a glance ────────────────────────────────────────────── */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-ink">Vendors at a glance</h3>
            <p className="text-[12px] text-muted mt-0.5">Sorted by lowest health score first</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12.5px] font-medium text-muted border border-border bg-surface hover:bg-hover transition-colors duration-180">
              <Filter className="h-[12px] w-[12px]" />
              Filter
            </button>
            <Link
              href="/vendors"
              className="inline-flex items-center h-7 px-3 rounded-lg text-[12.5px] font-medium text-muted border border-border bg-surface hover:bg-hover transition-colors duration-180"
            >
              View all
            </Link>
          </div>
        </div>

        {vendorRows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px] text-muted mb-4">No active vendors yet.</p>
            <Link
              href="/vendors/new"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover transition-colors duration-180"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first vendor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-header-cell">
                  {[
                    { label: 'Vendor',    align: 'left'  },
                    { label: 'Sector',    align: 'left'  },
                    { label: 'Contracts', align: 'right' },
                    { label: 'Health',    align: 'left'  },
                    { label: 'Renews',    align: 'right' },
                    { label: 'Issues',    align: 'right' },
                    { label: '',          align: 'right' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-4 py-2.5 text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted border-b border-border-soft',
                        h.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorRows.map((v, i) => (
                  <tr
                    key={v.id}
                    className={cn(
                      'group hover:bg-hover transition-colors duration-180',
                      i < vendorRows.length - 1 ? 'border-b border-border-soft' : ''
                    )}
                  >
                    {/* Vendor */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <VendorMark name={v.name} id={v.id} size={32} radius={8} />
                        <div>
                          <div className="font-semibold text-ink">{v.name}</div>
                          <div className="text-[11.5px] text-muted">{fmtValue(v.annualVal)} annual</div>
                        </div>
                      </div>
                    </td>
                    {/* Sector */}
                    <td className="px-4 py-3.5 text-ink-soft capitalize">
                      {v.serviceType.replace(/_/g, ' ')}
                    </td>
                    {/* Contracts · KPIs */}
                    <td className="px-4 py-3.5 text-right text-ink-soft">
                      {v.contractCount}
                      <span className="text-muted text-[12px]"> · {v.kpiCount} KPIs</span>
                    </td>
                    {/* Health */}
                    <td className="px-4 py-3.5">
                      {v.healthNum != null ? (
                        <HealthBar value={v.healthNum} />
                      ) : (
                        <span className="text-[12px] text-faint">No score</span>
                      )}
                    </td>
                    {/* Renews */}
                    <td className="px-4 py-3.5 text-right text-ink-soft">
                      {daysFromNow(v.nextRenewal) ?? '—'}
                    </td>
                    {/* Issues */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[12px] text-faint">—</span>
                    </td>
                    {/* Chevron */}
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/vendors/${v.id}`}>
                        <ChevronRight className="h-4 w-4 text-faint group-hover:text-muted transition-colors ml-auto" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Title */}
      <div className="flex items-end justify-between mb-6">
        <div className="space-y-2">
          <div className="h-3 w-48 bg-border rounded" />
          <div className="h-8 w-64 bg-border rounded" />
          <div className="h-3 w-80 bg-border rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-36 bg-border rounded-lg" />
          <div className="h-8 w-28 bg-border rounded-lg" />
        </div>
      </div>
      {/* Action queue */}
      <div className="h-32 bg-surface border border-border rounded-lg" />
      {/* Health + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="h-64 bg-surface border border-border rounded-lg" />
        <div className="h-64 bg-surface border border-border rounded-lg" />
      </div>
      {/* Table */}
      <div className="h-64 bg-surface border border-border rounded-lg" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// DashboardData is an async Server Component. React 18's JSX types don't model
// async functions as element types (next build rejects it even though tsc is
// happy), so cast for the type checker — Next streams it correctly at runtime.
const DashboardStream = DashboardData as unknown as () => JSX.Element

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardStream />
    </Suspense>
  )
}
