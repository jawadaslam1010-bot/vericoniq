export const dynamic = 'force-dynamic'

import { requirePlatformAdmin, logPlatformAction } from '@/lib/platform-admin'
import { db } from '@contractly/db'
import { organisations, users, vendors, contracts, kpis, submissionPeriods } from '@contractly/db/schema'
import { eq, count, sql, desc } from '@contractly/db'
import Link from 'next/link'
import { Building2, Users, FileText, TrendingUp, ChevronRight, Circle } from 'lucide-react'

function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(d: Date | string | null): string {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default async function PlatformAdminPage() {
  const adminEmail = await requirePlatformAdmin()

  // ── Fetch all orgs with counts ─────────────────────────────────────────────
  const orgs = await db.select().from(organisations).orderBy(desc(organisations.createdAt))

  const orgIds = orgs.map(o => o.id)

  // Sequential count queries — concurrent groupBy selects deadlock the
  // single-connection pool against the Supabase transaction pooler (each is
  // ~15ms, so serialization costs nothing).
  const userCounts = await db.select({ orgId: users.orgId, n: count() }).from(users).groupBy(users.orgId)
  const vendorCounts = await db.select({ orgId: vendors.orgId, n: count() }).from(vendors).groupBy(vendors.orgId)
  const contractCounts = await db.select({ orgId: contracts.orgId, n: count() }).from(contracts).groupBy(contracts.orgId)
  const kpiCounts = await db.select({ orgId: kpis.orgId, n: count() }).from(kpis).where(eq(kpis.isActive, true)).groupBy(kpis.orgId)
  // Latest period updated_at per org
  const periodCounts = await db
    .select({
      orgId: submissionPeriods.orgId,
      lastActivity: sql<string>`max(${submissionPeriods.updatedAt})`,
    })
    .from(submissionPeriods)
    .groupBy(submissionPeriods.orgId)

  const toMap = <T extends { orgId: string }>(arr: T[]) =>
    Object.fromEntries(arr.map(r => [r.orgId, r]))

  const uMap = toMap(userCounts)
  const vMap = toMap(vendorCounts)
  const cMap = toMap(contractCounts)
  const kMap = toMap(kpiCounts)
  const pMap = toMap(periodCounts)

  // ── Platform summary stats ─────────────────────────────────────────────────
  const totalUsers     = userCounts.reduce((s, r) => s + Number(r.n), 0)
  const totalContracts = contractCounts.reduce((s, r) => s + Number(r.n), 0)
  const totalKpis      = kpiCounts.reduce((s, r) => s + Number(r.n), 0)

  // Log the page view
  await logPlatformAction({ adminEmail, action: 'org.list.viewed' })

  const planColour: Record<string, string> = {
    starter:      'text-slate-400 bg-slate-400/10 border-slate-400/20',
    professional: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    enterprise:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold text-white">Organisations</h1>
        <p className="text-[13px] text-white/40 mt-1">
          {orgs.length} org{orgs.length !== 1 ? 's' : ''} · {totalUsers} users · {totalContracts} contracts · {totalKpis} active KPIs
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Orgs', value: orgs.length, icon: Building2, colour: 'text-violet-400' },
          { label: 'Total users', value: totalUsers, icon: Users, colour: 'text-sky-400' },
          { label: 'Contracts', value: totalContracts, icon: FileText, colour: 'text-emerald-400' },
          { label: 'Active KPIs', value: totalKpis, icon: TrendingUp, colour: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, colour }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <Icon className={`w-5 h-5 ${colour} mb-3`} />
            <p className="text-[28px] font-bold text-white leading-none">{value}</p>
            <p className="text-[12px] text-white/40 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Org table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/10">
              {['Organisation', 'Plan', 'Users', 'Vendors', 'Contracts', 'Active KPIs', 'Last activity', 'Joined', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/30">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orgs.map(org => {
              const lastActivity = pMap[org.id]?.lastActivity ?? null
              const daysSince = lastActivity
                ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86_400_000)
                : null
              const activityDot = daysSince === null ? 'text-white/20'
                : daysSince <= 7 ? 'text-emerald-400'
                : daysSince <= 30 ? 'text-amber-400'
                : 'text-red-500'

              return (
                <tr key={org.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Circle className={`w-2 h-2 fill-current ${activityDot} shrink-0`} />
                      <div>
                        <p className="font-semibold text-white">{org.name}</p>
                        {org.industry && (
                          <p className="text-[11px] text-white/30 mt-0.5">{org.industry}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${planColour[org.plan] ?? planColour.starter}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-white/60">{Number(uMap[org.id]?.n ?? 0)}</td>
                  <td className="px-4 py-3.5 text-white/60">{Number(vMap[org.id]?.n ?? 0)}</td>
                  <td className="px-4 py-3.5 text-white/60">{Number(cMap[org.id]?.n ?? 0)}</td>
                  <td className="px-4 py-3.5 text-white/60">{Number(kMap[org.id]?.n ?? 0)}</td>
                  <td className="px-4 py-3.5 text-white/40 text-[12px]">
                    {lastActivity ? timeAgo(lastActivity) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-white/40 text-[12px]">{fmtDate(org.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-medium transition-colors opacity-0 group-hover:opacity-100"
                    >
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {orgs.length === 0 && (
          <div className="py-16 text-center text-white/30 text-[13px]">No organisations yet.</div>
        )}
      </div>
    </div>
  )
}
