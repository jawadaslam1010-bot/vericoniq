export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox, ShieldQuestion, ClipboardCheck, Sparkles, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull } from '@contractly/db'
import { users, vendors, contracts, kpis, kpiResults, submissionPeriods } from '@contractly/db/schema'
import { PageTitle } from '@/components/shared/page-title'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inbox · VericonIQ' }

type Item = {
  icon: React.ElementType
  tone: 'risk' | 'breach' | 'info' | 'met'
  title: string
  detail: string
  href: string
  cta: string
}

const TONE_CLASSES: Record<string, string> = {
  met:    'bg-status-met-bg    text-status-met-text',
  risk:   'bg-status-risk-bg   text-status-risk-text',
  breach: 'bg-status-breach-bg text-status-breach-text',
  info:   'bg-status-info-bg   text-status-info-text',
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')
  const orgId = userRecord.orgId

  const [allVendors, allContracts, pendingExemptions, submittedPeriods, aiKpisPendingReview] = await Promise.all([
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(and(eq(vendors.orgId, orgId), isNull(vendors.deletedAt))),
    db.select().from(contracts).where(eq(contracts.orgId, orgId)),
    db.select({ result: kpiResults, kpiName: kpis.name })
      .from(kpiResults)
      .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
      .where(and(eq(kpiResults.orgId, orgId), eq(kpiResults.exemptionStatus, 'pending'))),
    db.select().from(submissionPeriods).where(and(eq(submissionPeriods.orgId, orgId), eq(submissionPeriods.status, 'submitted'))),
    db.select({ id: kpis.id, contractId: kpis.contractId })
      .from(kpis)
      .where(and(eq(kpis.orgId, orgId), eq(kpis.isActive, false), eq(kpis.addedBy, 'ai'))),
  ])

  const vendorName = new Map(allVendors.map(v => [v.id, v.name]))
  const contractById = new Map(allContracts.map(c => [c.id, c]))
  const linkFor = (contractId: string, suffix = '') => {
    const c = contractById.get(contractId)
    return c ? `/vendors/${c.vendorId}/contracts/${c.id}${suffix}` : '/vendors'
  }
  const nameFor = (contractId: string) => {
    const c = contractById.get(contractId)
    return c ? `${vendorName.get(c.vendorId) ?? 'Vendor'} · ${c.name}` : 'Contract'
  }

  const items: Item[] = []

  // Vendor-submitted periods awaiting review
  for (const p of submittedPeriods) {
    items.push({
      icon: ClipboardCheck,
      tone: 'info',
      title: 'Vendor submission awaiting review',
      detail: `${nameFor(p.contractId)} · ${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`,
      href: linkFor(p.contractId, `/submissions/${p.id}`),
      cta: 'Review results',
    })
  }

  // Pending exemption claims
  for (const e of pendingExemptions) {
    items.push({
      icon: ShieldQuestion,
      tone: 'risk',
      title: `Exemption claimed — ${e.kpiName}`,
      detail: `${nameFor(e.result.contractId)}${e.result.exemptionReason ? ` · "${e.result.exemptionReason.slice(0, 80)}"` : ''}`,
      href: linkFor(e.result.contractId, `/submissions/${e.result.periodId}`),
      cta: 'Approve / decline',
    })
  }

  // AI-extracted KPIs awaiting activation, grouped per contract
  const pendingByContract = new Map<string, number>()
  for (const k of aiKpisPendingReview) {
    pendingByContract.set(k.contractId, (pendingByContract.get(k.contractId) ?? 0) + 1)
  }
  for (const [contractId, count] of pendingByContract) {
    items.push({
      icon: Sparkles,
      tone: 'info',
      title: `${count} AI-extracted KPI${count !== 1 ? 's' : ''} awaiting review`,
      detail: nameFor(contractId),
      href: linkFor(contractId, '/kpis'),
      cta: 'Review KPIs',
    })
  }

  // Notice deadlines within 45 days
  const now = Date.now()
  for (const c of allContracts) {
    if (c.status !== 'active') continue
    const deadline = c.noticeDeadline ?? c.endDate
    if (!deadline) continue
    const days = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - now) / 86_400_000)
    if (days < 0 || days > 45) continue
    items.push({
      icon: CalendarClock,
      tone: days <= 14 ? 'breach' : 'risk',
      title: `${c.noticeDeadline ? 'Notice deadline' : 'Contract expiry'} in ${days} day${days !== 1 ? 's' : ''}`,
      detail: `${nameFor(c.id)} · ${fmtDate(deadline)}`,
      href: linkFor(c.id),
      cta: 'Review contract',
    })
  }

  return (
    <div>
      <PageTitle subtitle={items.length === 0 ? 'Nothing needs your attention right now.' : `${items.length} item${items.length !== 1 ? 's' : ''} need${items.length === 1 ? 's' : ''} your attention`}>
        Inbox
      </PageTitle>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-status-met-bg flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-status-met-text" />
          </div>
          <h3 className="text-[15px] font-semibold text-ink">All clear</h3>
          <p className="text-[13px] text-muted mt-1.5 max-w-sm">
            Pending exemptions, vendor submissions, KPI reviews and approaching deadlines will queue up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-border bg-surface overflow-hidden">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-t border-border-soft first:border-t-0 hover:bg-hover transition-colors">
                <div className={cn('w-[34px] h-[34px] rounded-lg flex items-center justify-center shrink-0', TONE_CLASSES[item.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-ink truncate">{item.title}</div>
                  <div className="text-[12px] text-muted truncate">{item.detail}</div>
                </div>
                <Link href={item.href} className="shrink-0 text-[12.5px] font-medium text-primary hover:underline">
                  {item.cta} →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
