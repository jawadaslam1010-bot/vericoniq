'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type KpiRow = {
  result: {
    id: string
    actualValue: string | null
    comment: string | null
    exemptionClaimed: boolean
    exemptionReason: string | null
    resultStatus: string | null
  }
  kpi: {
    id: string
    name: string
    kpiType: string
    targetValue: string | null
    targetOperator: string | null
    targetValueMax: string | null
    unitLabel: string | null
    cadence: string
    resultType: string | null
  }
}

type Props = {
  token: string
  periodId: string
  periodStatus: string
  rows: KpiRow[]
}

function formatTarget(kpi: KpiRow['kpi']): string {
  if (kpi.resultType === 'binary') return 'Met / Not met'
  if (kpi.targetValue == null) return '—'
  const op = kpi.targetOperator ?? 'gte'
  const val = parseFloat(kpi.targetValue)
  const unit = kpi.unitLabel ? ` ${kpi.unitLabel}` : ''
  if (op === 'gte') return `≥ ${val}${unit}`
  if (op === 'lte') return `≤ ${val}${unit}`
  if (op === 'eq') return `= ${val}${unit}`
  if (op === 'between' && kpi.targetValueMax) return `${val} – ${parseFloat(kpi.targetValueMax)}${unit}`
  return `${val}${unit}`
}

function ResultBadge({ status, exemptionClaimed }: { status: string | null; exemptionClaimed: boolean }) {
  if (exemptionClaimed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        Exemption claimed
      </span>
    )
  }
  switch (status) {
    case 'met':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Met
        </span>
      )
    case 'risk':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          At risk
        </span>
      )
    case 'breach':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Breach
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface text-faint border border-border">
          Not entered
        </span>
      )
  }
}

export function PortalForm({ token, periodId, periodStatus, rows }: Props) {
  const isSubmitted = periodStatus === 'submitted'

  const [values, setValues] = useState<Record<string, {
    actualValue: string
    comment: string
    exemptionClaimed: boolean
    exemptionReason: string
    resultStatus: string | null
    saving: boolean
    dirty: boolean
  }>>(() =>
    Object.fromEntries(rows.map(r => [r.result.id, {
      actualValue: r.result.actualValue ?? '',
      comment: r.result.comment ?? '',
      exemptionClaimed: r.result.exemptionClaimed,
      exemptionReason: r.result.exemptionReason ?? '',
      resultStatus: r.result.resultStatus,
      saving: false,
      dirty: false,
    }]))
  )

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(isSubmitted)

  const setValue = (id: string, field: string, val: string | boolean) => {
    setValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: val, dirty: true } }))
  }

  const saveSingle = async (resultId: string) => {
    if (submitted) return
    const v = values[resultId]
    setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], saving: true } }))
    try {
      const res = await fetch('/api/portal/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          resultId,
          actualValue: v.actualValue !== '' ? v.actualValue : null,
          comment: v.comment || null,
          exemptionClaimed: v.exemptionClaimed,
          exemptionReason: v.exemptionReason || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }
      const data = await res.json()
      setValues(prev => ({
        ...prev,
        [resultId]: { ...prev[resultId], saving: false, dirty: false, resultStatus: data.resultStatus ?? null },
      }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
      setValues(prev => ({ ...prev, [resultId]: { ...prev[resultId], saving: false } }))
    }
  }

  const handleSubmit = async () => {
    // Save all dirty rows first
    const dirty = Object.entries(values).filter(([, v]) => v.dirty)
    if (dirty.length > 0) {
      for (const [id] of dirty) {
        await saveSingle(id)
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/submit-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submit failed')
      }
      setSubmitted(true)
      toast.success('Submission received')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    let entered = 0, breaches = 0, exemptions = 0
    rows.forEach(r => {
      const v = values[r.result.id]
      if (v.exemptionClaimed) { entered++; exemptions++ }
      else if (v.actualValue !== '') {
        entered++
        if (v.resultStatus === 'breach') breaches++
      }
    })
    return { entered, breaches, exemptions, total: rows.length }
  }, [rows, values])

  const dirtyCount = Object.values(values).filter(v => v.dirty).length

  if (submitted) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-ink">Submission received</h2>
          <p className="text-[13px] text-muted mt-1.5 max-w-sm mx-auto">
            Your KPI data has been submitted for review. Your contract manager will be in touch if any follow-up is needed.
          </p>
        </div>
        <div className="inline-flex items-center gap-6 mt-6 px-6 py-3 rounded-xl bg-surface border border-border text-[12px] text-muted">
          <span><span className="font-semibold text-ink">{stats.entered}</span> / {stats.total} entered</span>
          {stats.breaches > 0 && <span><span className="font-semibold text-red-600">{stats.breaches}</span> breaches</span>}
          {stats.exemptions > 0 && <span><span className="font-semibold text-amber-600">{stats.exemptions}</span> exemptions claimed</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-ink">{stats.entered}<span className="text-[14px] font-normal text-muted">/{stats.total}</span></p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted mt-0.5">Entered</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-red-600">{stats.breaches}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted mt-0.5">Breaches</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-amber-600">{stats.exemptions}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted mt-0.5">Exemptions</p>
        </div>
      </div>

      {/* KPI list */}
      <div className="space-y-3">
        {rows.map(r => {
          const v = values[r.result.id]
          const isBinary = r.kpi.resultType === 'binary'

          return (
            <div
              key={r.result.id}
              className={`bg-surface border rounded-xl p-5 transition-colors ${v.dirty ? 'border-primary/40' : 'border-border'}`}
            >
              {/* KPI name + target + badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink leading-snug">{r.kpi.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted">Target: <span className="font-medium text-ink/80">{formatTarget(r.kpi)}</span></span>
                    <span className="text-faint">·</span>
                    <span className="text-[11px] text-muted capitalize">{r.kpi.cadence}</span>
                    <span className="text-faint">·</span>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      r.kpi.kpiType === 'contractual'
                        ? 'bg-violet-50 text-violet-700'
                        : 'bg-sky-50 text-sky-700'
                    }`}>
                      {r.kpi.kpiType}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <ResultBadge status={v.resultStatus} exemptionClaimed={v.exemptionClaimed} />
                </div>
              </div>

              {/* Input area */}
              {isBinary ? (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setValue(r.result.id, 'actualValue', '1'); setValue(r.result.id, 'exemptionClaimed', false) }}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                      v.actualValue === '1' && !v.exemptionClaimed
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-surface text-muted border-border hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    Met
                  </button>
                  <button
                    onClick={() => { setValue(r.result.id, 'actualValue', '0'); setValue(r.result.id, 'exemptionClaimed', false) }}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                      v.actualValue === '0' && !v.exemptionClaimed
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-surface text-muted border-border hover:border-red-300 hover:text-red-700'
                    }`}
                  >
                    Not met
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={v.actualValue}
                      onChange={e => setValue(r.result.id, 'actualValue', e.target.value)}
                      placeholder="Enter value"
                      className="w-full px-3 py-2.5 text-[13px] border border-border rounded-lg bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {r.kpi.unitLabel && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted pointer-events-none">
                        {r.kpi.unitLabel}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Comment */}
              <textarea
                value={v.comment}
                onChange={e => setValue(r.result.id, 'comment', e.target.value)}
                placeholder="Optional comment (context, explanation, etc.)"
                rows={1}
                className="w-full px-3 py-2 text-[12.5px] border border-border rounded-lg bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none mb-3"
              />

              {/* Exemption toggle */}
              <div className="flex items-start gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={v.exemptionClaimed}
                    onChange={e => setValue(r.result.id, 'exemptionClaimed', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary accent-primary"
                  />
                  <span className="text-[12.5px] text-muted">Claim exemption</span>
                </label>

                <button
                  onClick={() => saveSingle(r.result.id)}
                  disabled={!v.dirty || v.saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border bg-surface text-muted hover:text-ink hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {v.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>

              {v.exemptionClaimed && (
                <div className="mt-3 pl-6">
                  <textarea
                    value={v.exemptionReason}
                    onChange={e => setValue(r.result.id, 'exemptionReason', e.target.value)}
                    placeholder="Reason for exemption (required) — explain why this KPI cannot be met due to factors outside your control."
                    rows={2}
                    className="w-full px-3 py-2 text-[12.5px] border border-amber-200 rounded-lg bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none"
                  />
                  <p className="text-[11px] text-amber-600 mt-1">
                    Exemptions are reviewed and approved by your contract manager before taking effect.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit footer */}
      <div className="sticky bottom-0 bg-page border-t border-border pt-4 pb-4 flex items-center justify-between gap-4">
        <div className="text-[12.5px] text-muted">
          {dirtyCount > 0 ? (
            <span className="text-amber-600 font-medium">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
          ) : (
            <span>{stats.entered} / {stats.total} KPIs entered</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const dirty = Object.entries(values).filter(([, v]) => v.dirty)
                for (const [id] of dirty) await saveSingle(id)
                toast.success('All changes saved')
              }}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save all
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || stats.entered === 0}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit to contract manager'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
