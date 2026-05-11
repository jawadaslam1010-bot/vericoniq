'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Pencil, X, Check, AlertTriangle } from 'lucide-react'

type KPI = {
  id: string
  name: string
  description: string | null
  kpiType: string
  category: string | null
  targetValue: string | null
  targetOperator: string
  targetValueMax: string | null
  unit: string | null
  unitLabel: string | null
  cadence: string
  creditFormula: string | null
  creditPerUnit: string | null
  creditPercentMrc: string | null
  creditCapPercent: string | null
  creditCapAmount: string | null
  clauseRef: string | null
  isActive: boolean
}

type KeyTerm = {
  id: string
  termType: string
  label: string
  value: string
  clauseRef: string | null
  isAiFlagged: boolean
  flagReason: string | null
}

// ---------------------------------------------------------------------------
// EditKpiForm (internal sub-component)
// ---------------------------------------------------------------------------

type EditKpiFormProps = {
  kpi: KPI
  onCancel: () => void
  onSaved: () => void
}

function EditKpiForm({ kpi, onCancel, onSaved }: EditKpiFormProps) {
  const [name, setName] = useState(kpi.name)
  const [targetValue, setTargetValue] = useState(kpi.targetValue ?? '')
  const [targetOperator, setTargetOperator] = useState(kpi.targetOperator)
  const [targetValueMax, setTargetValueMax] = useState(kpi.targetValueMax ?? '')
  const [unitLabel, setUnitLabel] = useState(kpi.unitLabel ?? '')
  const [cadence, setCadence] = useState(kpi.cadence)
  const [creditFormula, setCreditFormula] = useState(kpi.creditFormula ?? '')
  const [creditCapAmount, setCreditCapAmount] = useState(kpi.creditCapAmount ?? '')
  const [isActive, setIsActive] = useState(String(kpi.isActive))

  useEffect(() => {
    setName(kpi.name)
    setTargetValue(kpi.targetValue ?? '')
    setTargetOperator(kpi.targetOperator)
    setTargetValueMax(kpi.targetValueMax ?? '')
    setUnitLabel(kpi.unitLabel ?? '')
    setCadence(kpi.cadence)
    setCreditFormula(kpi.creditFormula ?? '')
    setCreditCapAmount(kpi.creditCapAmount ?? '')
    setIsActive(String(kpi.isActive))
  }, [kpi.id])

  const updateMutation = api.kpis.update.useMutation({
    onSuccess: () => {
      toast.success('KPI updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update KPI')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: kpi.id,
      name,
      targetValue: targetValue || null,
      targetOperator,
      targetValueMax: targetOperator === 'between' ? (targetValueMax || null) : null,
      unitLabel: unitLabel || null,
      cadence: cadence as 'weekly' | 'monthly' | 'quarterly' | 'annual',
      creditFormula: creditFormula || null,
      creditCapAmount: creditCapAmount || null,
      isActive: isActive === 'true',
    })
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor={`name-${kpi.id}`}>Name</Label>
          <Input
            id={`name-${kpi.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`operator-${kpi.id}`}>Target Operator</Label>
          <Select value={targetOperator} onValueChange={setTargetOperator}>
            <SelectTrigger id={`operator-${kpi.id}`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gte">≥ (gte)</SelectItem>
              <SelectItem value="lte">≤ (lte)</SelectItem>
              <SelectItem value="eq">= (eq)</SelectItem>
              <SelectItem value="between">between</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`targetValue-${kpi.id}`}>Target Value</Label>
          <Input
            id={`targetValue-${kpi.id}`}
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="mt-1"
          />
        </div>

        {targetOperator === 'between' && (
          <div>
            <Label htmlFor={`targetValueMax-${kpi.id}`}>Target Value Max</Label>
            <Input
              id={`targetValueMax-${kpi.id}`}
              type="number"
              value={targetValueMax}
              onChange={(e) => setTargetValueMax(e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor={`unitLabel-${kpi.id}`}>Unit Label</Label>
          <Input
            id={`unitLabel-${kpi.id}`}
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`cadence-${kpi.id}`}>Cadence</Label>
          <Select value={cadence} onValueChange={setCadence}>
            <SelectTrigger id={`cadence-${kpi.id}`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor={`creditFormula-${kpi.id}`}>Credit Formula</Label>
          <Textarea
            id={`creditFormula-${kpi.id}`}
            rows={2}
            value={creditFormula}
            onChange={(e) => setCreditFormula(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`creditCapAmount-${kpi.id}`}>Credit Cap Amount</Label>
          <Input
            id={`creditCapAmount-${kpi.id}`}
            type="number"
            value={creditCapAmount}
            onChange={(e) => setCreditCapAmount(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`isActive-${kpi.id}`}>Status</Label>
          <Select value={isActive} onValueChange={setIsActive}>
            <SelectTrigger id={`isActive-${kpi.id}`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTarget(kpi: KPI): string {
  const unit = kpi.unitLabel ?? kpi.unit ?? ''
  const suffix = unit ? ` ${unit}` : ''
  switch (kpi.targetOperator) {
    case 'gte':
      return `≥ ${kpi.targetValue ?? ''}${suffix}`
    case 'lte':
      return `≤ ${kpi.targetValue ?? ''}${suffix}`
    case 'eq':
      return `= ${kpi.targetValue ?? ''}${suffix}`
    case 'between':
      return `${kpi.targetValue ?? ''} – ${kpi.targetValueMax ?? ''}${suffix}`
    default:
      return kpi.targetValue ?? '—'
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const TERM_TYPE_ORDER = ['date', 'obligation', 'liability', 'payment', 'dispute', 'termination']

// ---------------------------------------------------------------------------
// KpiReviewClient (exported)
// ---------------------------------------------------------------------------

export function KpiReviewClient({
  kpis,
  keyTerms,
  contractId,
}: {
  kpis: KPI[]
  keyTerms: KeyTerm[]
  contractId: string
}) {
  const [activeTab, setActiveTab] = useState<'kpis' | 'terms' | 'flagged'>('kpis')
  const [editingId, setEditingId] = useState<string | null>(null)

  const flaggedCount = keyTerms.filter((t) => t.isAiFlagged).length

  // Group key terms by termType
  const grouped: Record<string, KeyTerm[]> = {}
  for (const term of keyTerms) {
    if (!grouped[term.termType]) grouped[term.termType] = []
    grouped[term.termType].push(term)
  }

  const termTypeKeys = [
    ...TERM_TYPE_ORDER.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !TERM_TYPE_ORDER.includes(k)),
  ]

  const flaggedTerms = keyTerms.filter((t) => t.isAiFlagged)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'kpis'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          KPIs ({kpis.length})
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'terms'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Key Terms ({keyTerms.length})
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'flagged'
              ? 'border-b-2 border-amber-500 text-amber-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Flagged
          {flaggedCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
              {flaggedCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1 — KPIs */}
      {activeTab === 'kpis' && (
        <div>
          {kpis.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No KPIs found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Target</th>
                    <th className="px-4 py-3 text-left">Cadence</th>
                    <th className="px-4 py-3 text-left">Credit Formula</th>
                    <th className="px-4 py-3 text-left">Clause</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpis.map((kpi) => (
                    <>
                      <tr key={kpi.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{kpi.name}</div>
                          {kpi.description && (
                            <div className="mt-0.5 text-xs text-slate-500">{kpi.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {kpi.kpiType === 'contractual' ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              contractual
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {kpi.kpiType}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatTarget(kpi)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {kpi.cadence}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
                          {kpi.creditFormula
                            ? kpi.creditFormula.length > 50
                              ? kpi.creditFormula.slice(0, 50) + '…'
                              : kpi.creditFormula
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 italic">
                          {kpi.clauseRef ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setEditingId(editingId === kpi.id ? null : kpi.id)
                            }
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Edit KPI"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                      {editingId === kpi.id && (
                        <tr key={`${kpi.id}-edit`}>
                          <td colSpan={7} className="px-4 pb-4">
                            <EditKpiForm
                              kpi={kpi}
                              onCancel={() => setEditingId(null)}
                              onSaved={() => setEditingId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 — Key Terms */}
      {activeTab === 'terms' && (
        <div className="space-y-6">
          {termTypeKeys.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No key terms found.</p>
          ) : (
            termTypeKeys.map((type) => (
              <div key={type}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {capitalize(type)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[type].map((term) => (
                    <Card key={term.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="font-medium text-slate-800">{term.label}</div>
                        <div className="mt-1 text-sm text-slate-600">{term.value}</div>
                        {term.clauseRef && (
                          <div className="mt-1 text-xs italic text-slate-400">
                            {term.clauseRef}
                          </div>
                        )}
                        {term.isAiFlagged && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            AI flagged: {term.flagReason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3 — Flagged */}
      {activeTab === 'flagged' && (
        <div className="space-y-3">
          {flaggedTerms.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No flagged items — all clear.
            </p>
          ) : (
            flaggedTerms.map((term) => (
              <Card key={term.id} className="border-amber-200 bg-amber-50/40">
                <CardContent className="flex gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <div className="font-medium text-slate-800">{term.label}</div>
                    <div className="mt-0.5 text-sm text-slate-600">{term.value}</div>
                    {term.clauseRef && (
                      <div className="mt-0.5 text-xs italic text-slate-400">
                        {term.clauseRef}
                      </div>
                    )}
                    {term.flagReason && (
                      <div className="mt-1 text-xs text-amber-700">{term.flagReason}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConfirmKpisButton (exported)
// ---------------------------------------------------------------------------

export function ConfirmKpisButton({ contractId }: { contractId: string }) {
  const router = useRouter()

  const activateMutation = api.kpis.activate.useMutation({
    onSuccess: () => {
      toast.success('KPIs activated! They are now live in the KPI register.')
      router.refresh()
    },
    onError: () => {
      toast.error('Failed to activate KPIs')
    },
  })

  return (
    <Button
      onClick={() => activateMutation.mutate({ contractId })}
      disabled={activateMutation.isPending}
    >
      {activateMutation.isPending ? 'Activating…' : 'Confirm & Activate KPIs'}
    </Button>
  )
}
