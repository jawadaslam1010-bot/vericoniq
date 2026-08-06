export const dynamic = 'force-dynamic'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import { db } from '@contractly/db'
import { platformAuditLog, organisations } from '@contractly/db/schema'
import { eq, desc } from '@contractly/db'
import Link from 'next/link'

function fmtDateTime(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const actionColour: Record<string, string> = {
  'org.viewed':                'text-sky-400',
  'org.list.viewed':           'text-sky-400/60',
  'user.impersonated':         'text-violet-400',
  'user.impersonation_ended':  'text-violet-400/60',
  'script.run':                'text-amber-400',
}

export default async function PlatformAuditPage() {
  await requirePlatformAdmin()

  const logs = await db
    .select()
    .from(platformAuditLog)
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(200)

  // Batch org names
  const orgIds = [...new Set(logs.map(l => l.targetOrgId).filter(Boolean) as string[])]
  const orgRows = orgIds.length > 0
    ? await db.select({ id: organisations.id, name: organisations.name }).from(organisations)
    : []
  const orgMap = Object.fromEntries(orgRows.map(o => [o.id, o.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-white">Platform audit log</h1>
        <p className="text-[13px] text-white/40 mt-1">Last 200 entries — immutable, append-only.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-white/30 text-[13px]">No entries yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/10">
                {['When', 'Admin', 'Action', 'Target org', 'IP', 'Metadata'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(entry => (
                <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white/40 text-[12px] whitespace-nowrap">
                    {fmtDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-[12px]">{entry.adminEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[12px] ${actionColour[entry.action] ?? 'text-white/50'}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    {entry.targetOrgId ? (
                      <Link
                        href={`/admin/orgs/${entry.targetOrgId}`}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {orgMap[entry.targetOrgId] ?? entry.targetOrgId.slice(0, 8) + '…'}
                      </Link>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[12px] font-mono">
                    {entry.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[11px] font-mono max-w-[200px] truncate">
                    {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
