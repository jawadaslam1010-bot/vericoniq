'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageTitle } from '@/components/shared/page-title'
import { ChevronLeft, Loader2, Save, Lock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

type KpiRow = {
  result: {
    id: string
    actualValue: string | null
    comment: string | null
    exemptionClaimed: boolean
    exemptionReason: string | null
    exemptionStatus: string
    resultStatus: string | null
    creditApplied: string | null
  }
  kpi: {
    id: string
    name: string
    kpiType: string
    category: string | null
    targetValue: string | null
    targetOperator: string
    targetValueMax: string | null
    unitLabel: string | null
    cadence: string
    resultType: string | null
    creditFormula: string | null
    creditCapAmount: string | null
  }
}

type Period = {
  id: string
  status: string
  label: string
  dueDate: string
}

type Props = {
  contract: { id: string; name: string }
  period: Period
  rows: KpiRow[]
  vendorId: string
}

type Filter = 'all' | 'contractual' | 'operational' | 'breach' | 'not_entered' | 'exemptions'

function statusBadgeProps(status: string | null): { status: 'met' | 'risk' | 'breach' | 'stale' | 'info'; label: string } {
  switch (status) {
    case 'met':     return { status: 'met', label: 'Met' }
    case 'risk':    return { status: 'risk', label: 'At risk' }
    case 'breach':  return { status: 'breach', label: 'Breach' }
    case 'exempt':  return { status: 'info', label: 'Exempt' }
    case 'pending': return { status: 'info', label: 'Exemption pending' }
    default:        return { status: 'stale', label: 'Not entered' }
  }
}

function formatTarget(kpi: KpiRow['kpi']): string {
  if (kpi.targetValue == null) return '—'
  const op = kpi.targetOperator
  const val = parseFloat(kpi.targetValue)
  const unit = kpi.unitLabel ? ` ${kpi.unitLabel}` : ''
  if (op === 'gte') return `≥ ${val}${unit}`
  if (op === 'lte') return `≤ ${val}${unit}`
  if (op === 'eq') return `= ${val}${unit}`
  if (op === 'between' && kpi.targetValueMax) return `${val} – ${parseFloat(kpi.targetValueMax)}${unit}`
  return `${val}${unit}`
}

export function ResultsEntryClient({ contract, period, rows, vendorId }: Props) {
  const router = useRouter()
  const isLocked = period.status === 'locked'

  // Local state for each row's editable fields
  const [values, setValues] = useState<Record<string, {
    actualValue: string
    comment: string
    exemptionClaimed: boolean
    exemptionReason: string
    exemptionStatus: string
    resultStatus: string | null
    saving: boolean
    reviewing: boolean
    dirty: boolean
  }>>(() =>
    Object.fromEntries(rows.map(r => [r.result.id, {
      actualValue: r.result.actualValue ?? '',
      comment: r.result.comment ?? '',
      exemptionClaimed: r.result.exemptionClaimed,
      exemptionReason: r.result.exemptionReason ?? '',
      exemptionStatus: r.result.exemptionStatus,
      resultStatus: r.result.resultStatus,
      saving: false,
      reviewing: false,
      dirty: false,
    }]))
  )

  const [filter, setFilter] = useState<Filter>('all')
  const [savingAll, setSavingAll] = useState(false)

  const saveResult = api.submissions.saveResult.useMutation()
  const updateStatus = api.submissions.updatePeriodStatus.useMutation()
  const reviewExemption = api.submissions.reviewExemption.useMutation()

  const handleReview = async (resultId: string, decision: 'approved' | 'declined') => {
    setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], reviewing: true } }))
    try {
      await reviewExemption.mutateAsync({ resultId, decision })
      // If approved → resultStatus becomes 'exempt'; if declined → stays as calculated
      setValues(prev => ({
        ...prev,
        [resultId]: {
          ...prev[resultId],
          exemptionStatus: decision,
          resultStatus: decision === 'approved' ? 'exempt' : prev[resultId].resultStatus,
          reviewing: false,
        }
      }))
      toast.success(decision === 'approved' ? 'Exemption approved' : 'Exemption declined')
    } catch {
      toast.error('Failed to review exemption')
      setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], reviewing: false } }))
    }
  }

  const setValue = (id: string, field: string, val: string | boolean) => {
    setValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: val, dirty: true } }))
  }

  const saveSingle = async (resultId: string) => {
    const v = values[resultId]
    setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], saving: true } }))
    try {
      const res = await saveResult.mutateAsync({
        resultId,
        actualValue: v.actualValue !== '' ? v.actualValue : null,
        comment: v.comment || null,
        exemptionClaimed: v.exemptionClaimed,
        exemptionReason: v.exemptionReason || null,
      })
      setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], saving: false, dirty: false, resultStatus: res.resultStatus } }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
      setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], saving: false } }))
    }
  }

  const saveAll = async () => {
    setSavingAll(true)
    const dirty = Object.entries(values).filter(([, v]) => v.dirty)
    try {
      await Promise.all(dirty.map(([id]) => saveSingle(id)))
      toast.success(`Saved ${dirty.length} result${dirty.length !== 1 ? 's' : ''}`)
      router.refresh()
    } finally {
      setSavingAll(false)
    }
  }

  const lockPeriod = async () => {
    // Save any dirty first
    const dirty = Object.entries(values).filter(([, v]) => v.dirty)
    if (dirty.length > 0) await saveAll()
    await updateStatus.mutateAsync({ periodId: period.id, status: 'locked' })
    toast.success('Period locked')
    router.refresh()
  }

  const filteredRows = useMemo(() => rows.filter(r => {
    const v = values[r.result.id]
    const currentStatus = v.exemptionClaimed
      ? (v.exemptionStatus === 'approved' ? 'exempt' : v.exemptionStatus === 'declined' ? v.resultStatus : 'pending')
      : v.actualValue === '' ? null
      : v.resultStatus

    if (filter === 'contractual') return r.kpi.kpiType === 'contractual'
    if (filter === 'operational') return r.kpi.kpiType === 'operational'
    if (filter === 'breach') return currentStatus === 'breach'
    if (filter === 'not_entered') return !v.exemptionClaimed && v.actualValue === ''
    if (filter === 'exemptions') return v.exemptionClaimed
    return true
  }), [rows, values, filter])

  const stats = useMemo(() => {
    let entered = 0, breaches = 0, exempt = 0, pending = 0
    rows.forEach(r => {
      const v = values[r.result.id]
      if (v.exemptionClaimed) {
        entered++
        if (v.exemptionStatus === 'approved') exempt++
        else if (v.exemptionStatus === 'pending') pending++
      } else if (v.actualValue !== '') {
        entered++
        if (v.resultStatus === 'breach') breaches++
      }
    })
    return { entered, breaches, exempt, pending, total: rows.length }
  }, [rows, values])

  const dirtyCount = Object.values(values).filter(v => v.dirty).length

  const pendingCount = Object.values(values).filter(v => v.exemptionClaimed && v.exemptionStatus === 'pending').length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${rows.length})` },
    { key: 'contractual', label: 'Contractual' },
    { key: 'operational', label: 'Operational' },
    { key: 'breach', label: 'Breaches' },
    { key: 'not_entered', label: 'Not entered' },
    { key: 'exemptions', label: pendingCount > 0 ? `Exemptions (${pendingCount} pending)` : 'Exemptions' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link
          href={`/vendors/${vendorId}/contracts/${contract.id}/submissions`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Back to periods
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <PageTitle>{contract.name}</PageTitle>
            <p className="text-sm text-muted mt-1">{period.label} · Due {new Date(period.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          {!isLocked && (
            <div className="flex items-center gap-2 shrink-0">
              {dirtyCount > 0 && (
                <Button variant="outline" size="sm" onClick={saveAll} disabled={savingAll}>
                  {savingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save {dirtyCount} change{dirtyCount !== 1 ? 's' : ''}
                </Button>
              )}
              <Button size="sm" onClick={lockPeriod} disabled={updateStatus.isPending || savingAll}>
                <Lock className="mr-2 h-4 w-4" />
                Lock period
              </Button>
            </div>
          )}
          {isLocked && (
            <StatusBadge status="met" label="Locked" />
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total KPIs',  value: stats.total },
          { label: 'Entered',     value: `${stats.entered} / ${stats.total}` },
          { label: 'Breaches',    value: stats.breaches, danger: stats.breaches > 0 },
          { label: 'Exempt Pending', value: stats.pending, warn: stats.pending > 0 },
          { label: 'Exempt',      value: stats.exempt },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${
              s.danger ? 'text-status-breach-text' :
              s.warn   ? 'text-amber-600' :
              'text-ink'
            }`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-ink-soft hover:bg-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="bg-surface border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-header-cell">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted w-8">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">KPI</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Target</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted w-36">Actual value</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-eyebrow text-muted">Comment</th>
              {!isLocked && <th className="px-4 py-3 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {filteredRows.map((r, idx) => {
              const v = values[r.result.id]
                        // If exemption claimed but not yet reviewed → show pending; if reviewed → show resultStatus (exempt/breach)
              const displayStatus = v.exemptionClaimed
                ? (v.exemptionStatus === 'approved' ? 'exempt' : v.exemptionStatus === 'declined' ? v.resultStatus : 'pending')
                : (v.actualValue === '' ? null : v.resultStatus)
              const badge = statusBadgeProps(displayStatus)

              return (
                <tr key={r.result.id} className={`transition-colors ${v.dirty ? 'bg-amber-50/40' : 'hover:bg-hover'}`}>
                  <td className="px-4 py-3 text-xs text-muted">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink leading-snug">{r.kpi.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        r.kpi.kpiType === 'contractual'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.kpi.kpiType}
                      </span>
                      {r.kpi.cadence && (
                        <span className="text-[11px] text-muted">{r.kpi.cadence}</span>
                      )}
                    </div>
                    {v.exemptionClaimed && (
                      <div className="mt-1.5 space-y-1.5">
                        <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {v.exemptionStatus === 'approved' ? 'Exemption approved' :
                           v.exemptionStatus === 'declined' ? 'Exemption declined' :
                           'Exemption claimed'}
                        </p>
                        {v.exemptionReason && (
                          <p className="text-[11px] text-muted italic">"{v.exemptionReason}"</p>
                        )}
                        {!isLocked && (
                          <input
                            type="text"
                            placeholder="Reason for exemption…"
                            value={v.exemptionReason}
                            onChange={e => setValue(r.result.id, 'exemptionReason', e.target.value)}
                            className="w-full text-[12px] rounded border border-amber-200 bg-amber-50 px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        )}
                        {/* Operator approve / decline buttons — shown when pending */}
                        {v.exemptionStatus === 'pending' && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              onClick={() => handleReview(r.result.id, 'approved')}
                              disabled={v.reviewing}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-status-met-bg text-status-met-text border border-status-met-border hover:opacity-80 transition-opacity disabled:opacity-40"
                            >
                              {v.reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(r.result.id, 'declined')}
                              disabled={v.reviewing}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-status-breach-bg text-status-breach-text border border-status-breach-border hover:opacity-80 transition-opacity disabled:opacity-40"
                            >
                              {v.reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft text-[13px] whitespace-nowrap">
                    {formatTarget(r.kpi)}
                  </td>
                  <td className="px-4 py-3">
                    {r.kpi.resultType === 'binary' ? (
                      isLocked ? (
                        <span className={`text-sm font-medium ${v.actualValue === '1' ? 'text-status-met-text' : v.actualValue === '0' ? 'text-status-breach-text' : 'text-muted'}`}>
                          {v.actualValue === '1' ? 'Met' : v.actualValue === '0' ? 'Not met' : '—'}
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          {[{ val: '1', label: 'Met' }, { val: '0', label: 'Not met' }].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => setValue(r.result.id, 'actualValue', v.actualValue === opt.val ? '' : opt.val)}
                              className={`whitespace-nowrap px-3 py-1 rounded text-[12px] font-medium border transition-colors ${
                                v.actualValue === opt.val
                                  ? opt.val === '1'
                                    ? 'bg-status-met-bg text-status-met-text border-status-met-border'
                                    : 'bg-status-breach-bg text-status-breach-text border-status-breach-border'
                                  : 'bg-surface text-muted border-border hover:bg-hover'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )
                    ) : isLocked ? (
                      <span className="text-ink font-medium">{v.actualValue || '—'}</span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        placeholder="—"
                        value={v.actualValue}
                        onChange={e => setValue(r.result.id, 'actualValue', e.target.value)}
                        className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={badge.status} label={badge.label} />
                      {!isLocked && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={v.exemptionClaimed}
                            onChange={e => {
                              setValue(r.result.id, 'exemptionClaimed', e.target.checked)
                              if (e.target.checked) setValue(r.result.id, 'actualValue', '')
                            }}
                            className="h-3 w-3 rounded accent-amber-500"
                          />
                          <span className="text-[11px] text-muted">Claim exemption</span>
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isLocked ? (
                      <span className="text-[12px] text-muted italic">{v.comment || '—'}</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="Optional note…"
                        value={v.comment}
                        onChange={e => setValue(r.result.id, 'comment', e.target.value)}
                        className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    )}
                  </td>
                  {!isLocked && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => saveSingle(r.result.id)}
                        disabled={v.saving || !v.dirty}
                        className="rounded p-1.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-primary hover:bg-primary/10"
                        title={v.dirty ? 'Save this row' : 'No changes'}
                      >
                        {v.saving
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Save className="h-3.5 w-3.5" />
                        }
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">
            No KPIs match this filter.
          </div>
        )}
      </div>
    </div>
  )
}
