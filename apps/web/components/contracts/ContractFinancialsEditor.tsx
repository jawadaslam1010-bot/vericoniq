'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Check, X } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

const CURRENCIES = ['AUD', 'USD', 'NZD', 'EUR', 'GBP']

type Props = {
  contractId: string
  annualValue: string | null
  monthlyValue: string | null
  currency: string
  extractionStatus: string
}

function fmtCurrency(value: string | null, currency: string) {
  if (!value || value === '0') return '—'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function ContractFinancialsEditor({
  contractId,
  annualValue,
  monthlyValue,
  currency,
  extractionStatus,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [annual, setAnnual] = useState(annualValue ?? '')
  const [monthly, setMonthly] = useState(monthlyValue ?? '')
  const [curr, setCurr] = useState(currency)

  const mutation = api.contracts.updateDetails.useMutation({
    onSuccess: () => {
      toast.success('Contract values updated')
      setEditing(false)
      router.refresh()
    },
    onError: () => toast.error('Failed to save'),
  })

  const handleSave = () => {
    mutation.mutate({
      id: contractId,
      annualValue: annual.trim() || null,
      monthlyValue: monthly.trim() || null,
      currency: curr,
    })
  }

  const handleCancel = () => {
    setAnnual(annualValue ?? '')
    setMonthly(monthlyValue ?? '')
    setCurr(currency)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-[11.5px] font-bold uppercase tracking-eyebrow text-primary/70">Edit financial values</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <label className="w-28 shrink-0 text-[12px] text-muted">Annual value</label>
            <input
              type="number"
              value={annual}
              onChange={e => setAnnual(e.target.value)}
              placeholder="e.g. 556000"
              className="flex-1 h-7 rounded-md border border-border bg-surface px-2 text-[12.5px] text-ink focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-28 shrink-0 text-[12px] text-muted">Monthly value</label>
            <input
              type="number"
              value={monthly}
              onChange={e => setMonthly(e.target.value)}
              placeholder="e.g. 46333"
              className="flex-1 h-7 rounded-md border border-border bg-surface px-2 text-[12.5px] text-ink focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-28 shrink-0 text-[12px] text-muted">Currency</label>
            <select
              value={curr}
              onChange={e => setCurr(e.target.value)}
              className="flex-1 h-7 rounded-md border border-border bg-surface px-2 text-[12.5px] text-ink focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-white text-[12px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border text-[12px] text-ink-soft hover:bg-hover transition-colors"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {extractionStatus === 'complete' && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">Financial values</span>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <dt className="text-[12px] text-muted shrink-0">Annual value</dt>
        <dd className={cn('text-[12.5px] text-right', (!annualValue || annualValue === '0') && 'text-faint')}>
          {fmtCurrency(annualValue, currency)}
        </dd>
      </div>
      <div className="flex items-start justify-between gap-3">
        <dt className="text-[12px] text-muted shrink-0">Monthly value</dt>
        <dd className={cn('text-[12.5px] text-right', (!monthlyValue || monthlyValue === '0') && 'text-faint')}>
          {fmtCurrency(monthlyValue, currency)}
        </dd>
      </div>
      <div className="flex items-start justify-between gap-3">
        <dt className="text-[12px] text-muted shrink-0">Currency</dt>
        <dd className="text-[12.5px] text-ink-soft text-right">{currency}</dd>
      </div>
      {extractionStatus !== 'complete' && (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline mt-1"
        >
          <Pencil className="h-3 w-3" />
          Edit values
        </button>
      )}
    </div>
  )
}
