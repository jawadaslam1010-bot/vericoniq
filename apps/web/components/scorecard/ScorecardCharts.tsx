'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

export type PeriodStat = {
  label: string
  healthScore: number
  met: number
  risk: number
  breach: number
  exempt: number
  total: number
}

export type TopBreacher = {
  name: string
  breaches: number
  total: number
  kpiType: string
}

// ── Health trend ─────────────────────────────────────────────────────────────

export function HealthTrendChart({ data }: { data: PeriodStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8070' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8c8070' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, 'Health score']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8e4db' }}
        />
        <Area
          type="monotone"
          dataKey="healthScore"
          stroke="#0d9488"
          strokeWidth={2}
          fill="url(#healthGrad)"
          dot={{ r: 3, fill: '#0d9488' }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Stacked outcome bars ──────────────────────────────────────────────────────

export function OutcomeStackChart({ data }: { data: PeriodStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8070' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8c8070' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8e4db' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="met"    name="Met"    stackId="a" fill="#0d9488" radius={[0,0,0,0]} />
        <Bar dataKey="risk"   name="At risk" stackId="a" fill="#f59e0b" />
        <Bar dataKey="breach" name="Breach"  stackId="a" fill="#ef4444" />
        <Bar dataKey="exempt" name="Exempt"  stackId="a" fill="#94a3b8" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Top breaching KPIs ────────────────────────────────────────────────────────

export function TopBreachersTable({ data }: { data: TopBreacher[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No breaches recorded.</p>
  }
  return (
    <div className="divide-y divide-border-soft">
      {data.map((kpi, i) => {
        const pct = kpi.total > 0 ? Math.round((kpi.breaches / kpi.total) * 100) : 0
        return (
          <div key={kpi.name} className="flex items-center gap-3 py-2.5">
            <span className="w-5 text-[11px] font-bold text-muted shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink truncate">{kpi.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  kpi.kpiType === 'contractual' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {kpi.kpiType}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-semibold text-status-breach-text">{kpi.breaches} breach{kpi.breaches !== 1 ? 'es' : ''}</p>
              <p className="text-[11px] text-muted">{pct}% of periods</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
