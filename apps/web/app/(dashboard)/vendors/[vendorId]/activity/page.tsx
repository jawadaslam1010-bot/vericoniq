export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { Activity, CheckCircle2, AlertTriangle, Lock, CalendarPlus, LinkIcon, Eye, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { eq, and, isNull, inArray, isNotNull } from '@contractly/db'
import { vendors, users, contracts, kpis, kpiResults, submissionPeriods, portalTokens } from '@contractly/db/schema'
import { cn } from '@/lib/utils'

type Tone = 'met' | 'risk' | 'breach' | 'info' | 'stale'
type Event = { at: Date; icon: React.ElementType; tone: Tone; title: string; detail: string }

const TONE_CLASSES: Record<Tone, string> = {
  met:    'bg-status-met-bg    text-status-met-text',
  risk:   'bg-status-risk-bg   text-status-risk-text',
  breach: 'bg-status-breach-bg text-status-breach-text',
  info:   'bg-status-info-bg   text-status-info-text',
  stale:  'bg-status-stale-bg  text-status-stale-text',
}

function fmtDate(d: string | Date | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ActivityPage({ params }: { params: Promise<{ vendorId: string }> }) {
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

  const vendorContracts = await db
    .select({ id: contracts.id, name: contracts.name, createdAt: contracts.createdAt })
    .from(contracts)
    .where(and(eq(contracts.vendorId, vendorId), eq(contracts.orgId, userRecord.orgId)))
  const contractIds = vendorContracts.map(c => c.id)
  const contractName = new Map(vendorContracts.map(c => [c.id, c.name]))

  const events: Event[] = []

  // Contract added
  for (const c of vendorContracts) {
    events.push({ at: c.createdAt, icon: FileText, tone: 'info', title: 'Contract added', detail: c.name })
  }

  if (contractIds.length > 0) {
    const [results, periods, tokens] = await Promise.all([
      db.select({ result: kpiResults, kpiName: kpis.name })
        .from(kpiResults)
        .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
        .where(and(inArray(kpiResults.contractId, contractIds), isNotNull(kpiResults.submittedAt))),
      db.select().from(submissionPeriods).where(inArray(submissionPeriods.contractId, contractIds)),
      db.select().from(portalTokens).where(inArray(portalTokens.contractId, contractIds)),
    ])

    for (const r of results) {
      if (!r.result.submittedAt) continue
      const status = r.result.resultStatus
      const tone: Tone = status === 'breach' ? 'breach' : status === 'risk' ? 'risk' : status === 'met' ? 'met' : 'info'
      const icon = status === 'breach' ? AlertTriangle : CheckCircle2
      events.push({
        at: r.result.submittedAt,
        icon,
        tone,
        title: `Result submitted — ${r.kpiName}`,
        detail: `${contractName.get(r.result.contractId) ?? 'Contract'} · ${r.result.actualValue ?? '—'}${status ? ` · ${status}` : ''}`,
      })
    }

    for (const p of periods) {
      events.push({
        at: p.createdAt,
        icon: CalendarPlus,
        tone: 'info',
        title: 'Submission period created',
        detail: `${contractName.get(p.contractId) ?? 'Contract'} · ${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`,
      })
      if (p.status === 'locked') {
        events.push({
          at: p.updatedAt,
          icon: Lock,
          tone: 'stale',
          title: 'Period locked',
          detail: `${contractName.get(p.contractId) ?? 'Contract'} · ${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`,
        })
      }
    }

    for (const t of tokens) {
      events.push({
        at: t.createdAt,
        icon: LinkIcon,
        tone: 'info',
        title: 'Portal link generated',
        detail: `${contractName.get(t.contractId) ?? 'Contract'}${t.vendorEmail ? ` · ${t.vendorEmail}` : ''}`,
      })
      if (t.openedAt) {
        events.push({
          at: t.openedAt,
          icon: Eye,
          tone: 'met',
          title: 'Vendor opened portal',
          detail: contractName.get(t.contractId) ?? 'Contract',
        })
      }
    }
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime())
  const feed = events.slice(0, 60)

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-[15px] font-semibold text-ink">No activity yet</h3>
        <p className="text-[13px] text-muted mt-1.5 max-w-sm">
          Contract uploads, submission periods, and vendor results will appear here as they happen.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {feed.map((e, i) => {
        const Icon = e.icon
        return (
          <div key={i} className="flex gap-3 px-5 py-3.5 border-t border-border-soft first:border-t-0">
            <div className={cn('w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0', TONE_CLASSES[e.tone])}>
              <Icon className="h-[15px] w-[15px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-ink truncate">{e.title}</span>
                <span className="text-[11px] text-faint shrink-0">{relTime(e.at)}</span>
              </div>
              <div className="text-[12px] text-muted truncate">{e.detail}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
