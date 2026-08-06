export const dynamic = 'force-dynamic'

import { requirePlatformAdmin, logPlatformAction } from '@/lib/platform-admin'
import { db } from '@contractly/db'
import {
  organisations, users, vendors, contracts, kpis,
  submissionPeriods, kpiResults, portalTokens,
} from '@contractly/db/schema'
import { eq, and, count, sql, desc, asc } from '@contractly/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, FileText, TrendingUp,
  CheckCircle2, AlertTriangle, Clock, ExternalLink,
} from 'lucide-react'
import { ImpersonateButton } from './ImpersonateButton'

function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OrgDrilldownPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const adminEmail = await requirePlatformAdmin()

  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1)

  if (!org) notFound()

  // Parallel data fetches
  const [
    orgUsers,
    orgVendors,
    orgContracts,
    kpiCount,
    periodRows,
    recentResults,
    recentTokens,
  ] = await Promise.all([
    // Users
    db.select().from(users).where(eq(users.orgId, orgId)).orderBy(asc(users.createdAt)),

    // Vendors
    db.select().from(vendors).where(eq(vendors.orgId, orgId)).orderBy(asc(vendors.name)),

    // Contracts with vendor name
    db
      .select({ contract: contracts, vendorName: vendors.name })
      .from(contracts)
      .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
      .where(eq(contracts.orgId, orgId))
      .orderBy(desc(contracts.createdAt)),

    // Active KPI count
    db
      .select({ n: count() })
      .from(kpis)
      .where(and(eq(kpis.orgId, orgId), eq(kpis.isActive, true)))
      .then(r => Number(r[0]?.n ?? 0)),

    // Submission periods with result stats
    db
      .select({
        period: submissionPeriods,
        contractName: contracts.name,
        vendorName: vendors.name,
        total:   sql<number>`count(${kpiResults.id})`,
        entered: sql<number>`count(case when ${kpiResults.actualValue} is not null or ${kpiResults.exemptionClaimed} = true then 1 end)`,
        breaches: sql<number>`count(case when ${kpiResults.resultStatus} = 'breach' then 1 end)`,
      })
      .from(submissionPeriods)
      .leftJoin(kpiResults, eq(kpiResults.periodId, submissionPeriods.id))
      .innerJoin(contracts, eq(submissionPeriods.contractId, contracts.id))
      .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
      .where(eq(submissionPeriods.orgId, orgId))
      .groupBy(submissionPeriods.id, contracts.name, vendors.name)
      .orderBy(desc(submissionPeriods.updatedAt))
      .limit(20),

    // Recent KPI result saves
    db
      .select({
        result: kpiResults,
        kpiName: kpis.name,
        contractName: contracts.name,
      })
      .from(kpiResults)
      .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
      .innerJoin(contracts, eq(kpiResults.contractId, contracts.id))
      .where(eq(kpiResults.orgId, orgId))
      .orderBy(desc(kpiResults.updatedAt))
      .limit(8),

    // Portal tokens
    db
      .select()
      .from(portalTokens)
      .where(eq(portalTokens.orgId, orgId))
      .orderBy(desc(portalTokens.createdAt))
      .limit(10),
  ])

  // Log access
  await logPlatformAction({
    adminEmail,
    action: 'org.viewed',
    targetOrgId: orgId,
    metadata: { orgName: org.name },
  })

  const statusColour: Record<string, string> = {
    open:       'text-sky-400 bg-sky-400/10',
    submitted:  'text-amber-400 bg-amber-400/10',
    reviewing:  'text-orange-400 bg-orange-400/10',
    locked:     'text-emerald-400 bg-emerald-400/10',
  }

  const roleColour: Record<string, string> = {
    admin:   'text-violet-400 bg-violet-400/10',
    manager: 'text-sky-400 bg-sky-400/10',
    viewer:  'text-slate-400 bg-slate-400/10',
    owner:   'text-amber-400 bg-amber-400/10',
  }

  return (
    <div className="space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All orgs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-white">{org.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/40">
              <span className="capitalize">{org.plan} plan</span>
              {org.industry && <><span>·</span><span>{org.industry}</span></>}
              {org.abn && <><span>·</span><span>ABN {org.abn}</span></>}
              <span>·</span>
              <span>Joined {fmtDate(org.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/vendors`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open app
            </Link>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Users',        value: orgUsers.length,   icon: Users,      colour: 'text-sky-400' },
          { label: 'Vendors',      value: orgVendors.length, icon: Building2,  colour: 'text-violet-400' },
          { label: 'Contracts',    value: orgContracts.length, icon: FileText, colour: 'text-emerald-400' },
          { label: 'Active KPIs',  value: kpiCount,          icon: TrendingUp, colour: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, colour }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <Icon className={`w-4 h-4 ${colour} mb-3`} />
            <p className="text-[26px] font-bold text-white leading-none">{value}</p>
            <p className="text-[11px] text-white/30 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Users */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Users</p>
          </div>
          {orgUsers.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-white/30">No users yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {orgUsers.map(u => (
                <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-white font-medium">{u.fullName ?? 'Unnamed'}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{fmtDate(u.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${roleColour[u.role] ?? 'text-slate-400 bg-slate-400/10'}`}>
                      {u.role}
                    </span>
                    <ImpersonateButton
                      userId={u.id}
                      userEmail={u.fullName ?? u.id}
                      orgName={org.name}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendors + Contracts */}
        <div className="col-span-2 space-y-6">
          {/* Vendors */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10">
              <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Vendors</p>
            </div>
            {orgVendors.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-white/30">No vendors yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {orgVendors.map(v => (
                  <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-white font-medium">{v.name}</p>
                      <p className="text-[11px] text-white/30 mt-0.5 capitalize">{v.serviceType} · {v.status}</p>
                    </div>
                    {v.contactEmail && (
                      <span className="text-[11px] text-white/30">{v.contactEmail}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contracts */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10">
              <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Contracts</p>
            </div>
            {orgContracts.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-white/30">No contracts yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {orgContracts.map(({ contract: c, vendorName }) => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-white font-medium">{c.name}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{vendorName} · {fmtDate(c.startDate)} – {fmtDate(c.endDate)}</p>
                    </div>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded capitalize ${c.status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 bg-slate-400/10'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission periods */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/10">
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">
            Recent submission periods
          </p>
        </div>
        {periodRows.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-white/30">No submission periods yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/5">
                {['Vendor / Contract', 'Period', 'Status', 'Results', 'Breaches', 'Updated'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-white/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {periodRows.map(({ period, contractName, vendorName, total, entered, breaches }) => (
                <tr key={period.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium">{vendorName}</p>
                    <p className="text-white/30 text-[11px]">{contractName}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-[12px]">
                    {fmtDate(period.periodStart)} – {fmtDate(period.periodEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded capitalize ${statusColour[period.status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                      {period.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    <span className={Number(entered) === Number(total) && Number(total) > 0 ? 'text-emerald-400' : ''}>
                      {Number(entered)}/{Number(total)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {Number(breaches) > 0
                      ? <span className="text-red-400 font-medium">{Number(breaches)}</span>
                      : <span className="text-white/20">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[12px]">{fmtDateTime(period.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Portal tokens */}
      {recentTokens.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Portal links</p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/5">
                {['Vendor email', 'Created', 'Expires', 'Opened'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-white/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTokens.map(t => {
                const expired = new Date(t.expiresAt) < new Date()
                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/70">{t.vendorEmail ?? <span className="text-white/20 italic">no email</span>}</td>
                    <td className="px-4 py-3 text-white/40 text-[12px]">{fmtDateTime(t.createdAt)}</td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className={expired ? 'text-red-400' : 'text-white/40'}>{fmtDate(t.expiresAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {t.openedAt
                        ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{fmtDateTime(t.openedAt)}</span>
                        : <span className="text-white/20 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Not opened</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent KPI activity */}
      {recentResults.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Recent KPI activity</p>
          </div>
          <div className="divide-y divide-white/5">
            {recentResults.map(({ result, kpiName, contractName }) => {
              const statusIcon = result.resultStatus === 'met' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                : result.resultStatus === 'breach' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                : result.resultStatus === 'risk' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                : <Clock className="w-3.5 h-3.5 text-white/20" />

              return (
                <div key={result.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <div>
                      <p className="text-[13px] text-white/80">{kpiName}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{contractName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-white/60">
                      {result.actualValue != null ? result.actualValue : <span className="text-white/20">—</span>}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">{fmtDateTime(result.updatedAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
