'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Check, X, Sparkles, Loader2 } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractDetails = {
  id: string
  contractNumber: string | null
  startDate: string | null
  endDate: string | null
  noticePeriodDays: number | null
  noticeDeadline: string | null
  autoRenewal: boolean
  autoRenewalMonths: number | null
  annualValue: string | null
  monthlyValue: string | null
  currency: string
  perspective: string
  extractionStatus: string
}

type Props = {
  contract: ContractDetails
  hasDocuments?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCIES = ['AUD', 'USD', 'NZD', 'EUR', 'GBP']

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(value: string | null, currency: string) {
  if (!value || value === '0') return '—'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

// Calculate the notice deadline from end date + notice period if not explicitly set
function calcNoticeDeadline(endDate: string | null, noticePeriodDays: number | null): string | null {
  if (!endDate || !noticePeriodDays) return null
  const end = new Date(endDate)
  end.setDate(end.getDate() - noticePeriodDays)
  return end.toISOString().slice(0, 10)
}

// ─── Read row ────────────────────────────────────────────────────────────────

function Row({ label, value, faint }: { label: string; value: React.ReactNode; faint?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[12px] text-muted shrink-0">{label}</dt>
      <dd className={cn('text-[12.5px] text-right', faint ? 'text-faint' : 'text-ink-soft')}>{value}</dd>
    </div>
  )
}

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-32 shrink-0 text-[12px] text-muted">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'flex-1 h-7 rounded-md border border-border bg-surface px-2 text-[12.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40'
const selectCls = 'flex-1 h-7 rounded-md border border-border bg-surface px-2 text-[12.5px] text-ink focus:outline-none focus:ring-1 focus:ring-primary/40'

// ─── Main component ────────────────────────────────────────────────────────────

export function ContractDetailsPanel({ contract, hasDocuments = false }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [extracting, setExtracting] = useState(false)

  async function handleExtractDetails() {
    setExtracting(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/extract-details`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Extraction failed')
      } else {
        const fields: string[] = data.fieldsFound ?? []
        const LABELS: Record<string, string> = {
          contractNumber: 'Contract No.',
          startDate: 'Start date',
          endDate: 'End date',
          noticePeriodDays: 'Notice period',
          noticeDeadline: 'Notice deadline',
          autoRenewal: 'Auto-renewal',
          autoRenewalMonths: 'Renewal term',
          annualValue: 'Annual value',
          monthlyValue: 'Monthly value',
          currency: 'Currency',
        }
        const readable = fields.map(f => LABELS[f] ?? f).join(', ')
        if (fields.length > 0) {
          toast.success(`Extracted: ${readable}`)
        } else {
          toast.info('No new values found — check the terminal for what AI returned')
        }
        router.refresh()
      }
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setExtracting(false)
    }
  }

  // Edit state — initialised from props
  const [contractNumber, setContractNumber] = useState(contract.contractNumber ?? '')
  const [startDate, setStartDate] = useState(contract.startDate ?? '')
  const [endDate, setEndDate] = useState(contract.endDate ?? '')
  const [noticePeriodDays, setNoticePeriodDays] = useState(
    contract.noticePeriodDays != null ? String(contract.noticePeriodDays) : ''
  )
  const [noticeDeadline, setNoticeDeadline] = useState(contract.noticeDeadline ?? '')
  const [autoRenewal, setAutoRenewal] = useState(contract.autoRenewal)
  const [autoRenewalMonths, setAutoRenewalMonths] = useState(
    contract.autoRenewalMonths != null ? String(contract.autoRenewalMonths) : ''
  )
  const [annualValue, setAnnualValue] = useState(contract.annualValue ?? '')
  const [monthlyValue, setMonthlyValue] = useState(contract.monthlyValue ?? '')
  const [currency, setCurrency] = useState(contract.currency)
  const [perspective, setPerspective] = useState(contract.perspective)

  const mutation = api.contracts.updateDetails.useMutation({
    onSuccess: () => {
      toast.success('Contract details updated')
      setEditing(false)
      router.refresh()
    },
    onError: () => toast.error('Failed to save changes'),
  })

  const handleSave = () => {
    mutation.mutate({
      id: contract.id,
      contractNumber: contractNumber.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      noticePeriodDays: noticePeriodDays ? parseInt(noticePeriodDays, 10) : null,
      noticeDeadline: noticeDeadline || null,
      autoRenewal,
      autoRenewalMonths: autoRenewal && autoRenewalMonths ? parseInt(autoRenewalMonths, 10) : null,
      annualValue: annualValue.trim() || null,
      monthlyValue: monthlyValue.trim() || null,
      currency,
      perspective: perspective as 'buyer' | 'vendor',
    })
  }

  const handleCancel = () => {
    // Reset all fields to current contract values
    setContractNumber(contract.contractNumber ?? '')
    setStartDate(contract.startDate ?? '')
    setEndDate(contract.endDate ?? '')
    setNoticePeriodDays(contract.noticePeriodDays != null ? String(contract.noticePeriodDays) : '')
    setNoticeDeadline(contract.noticeDeadline ?? '')
    setAutoRenewal(contract.autoRenewal)
    setAutoRenewalMonths(contract.autoRenewalMonths != null ? String(contract.autoRenewalMonths) : '')
    setAnnualValue(contract.annualValue ?? '')
    setMonthlyValue(contract.monthlyValue ?? '')
    setCurrency(contract.currency)
    setPerspective(contract.perspective)
    setEditing(false)
  }

  // Computed notice deadline for display (if not explicitly set, derive from end date)
  const displayNoticeDeadline =
    contract.noticeDeadline ||
    calcNoticeDeadline(contract.endDate, contract.noticePeriodDays)

  const isAiPopulated = contract.extractionStatus === 'complete'

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-primary/70 mb-3">
          Edit contract details
        </p>

        <div className="space-y-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70">General</p>

          <Field label="Contract no.">
            <input
              type="text"
              value={contractNumber}
              onChange={e => setContractNumber(e.target.value)}
              placeholder="e.g. MSA-2023-001"
              className={inputCls}
            />
          </Field>

          <Field label="Perspective">
            <select value={perspective} onChange={e => setPerspective(e.target.value)} className={selectCls}>
              <option value="buyer">Buyer</option>
              <option value="vendor">Vendor</option>
            </select>
          </Field>
        </div>

        <div className="space-y-2.5 pt-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70">Dates</p>

          <Field label="Start date">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </Field>

          <Field label="End date">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Notice period">
            <div className="flex flex-1 items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={noticePeriodDays}
                onChange={e => setNoticePeriodDays(e.target.value)}
                placeholder="days"
                className={cn(inputCls, 'flex-1')}
              />
              <span className="text-[12px] text-muted shrink-0">days</span>
            </div>
          </Field>

          <Field label="Notice deadline">
            <input
              type="date"
              value={noticeDeadline}
              onChange={e => setNoticeDeadline(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="space-y-2.5 pt-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70">Renewal</p>

          <Field label="Auto-renewal">
            <div className="flex flex-1 items-center gap-2">
              <input
                type="checkbox"
                checked={autoRenewal}
                onChange={e => setAutoRenewal(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/40"
              />
              <span className="text-[12.5px] text-ink-soft">{autoRenewal ? 'Yes' : 'No'}</span>
            </div>
          </Field>

          {autoRenewal && (
            <Field label="Renewal term">
              <div className="flex flex-1 items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={autoRenewalMonths}
                  onChange={e => setAutoRenewalMonths(e.target.value)}
                  placeholder="months"
                  className={cn(inputCls, 'flex-1')}
                />
                <span className="text-[12px] text-muted shrink-0">months</span>
              </div>
            </Field>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70">Financial</p>

          <Field label="Annual value">
            <input
              type="number"
              value={annualValue}
              onChange={e => setAnnualValue(e.target.value)}
              placeholder="e.g. 556000"
              className={inputCls}
            />
          </Field>

          <Field label="Monthly value">
            <input
              type="number"
              value={monthlyValue}
              onChange={e => setMonthlyValue(e.target.value)}
              placeholder="e.g. 46333"
              className={inputCls}
            />
          </Field>

          <Field label="Currency">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-primary/10 mt-2">
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

  // ── Read mode ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">Details</span>
        <div className="flex items-center gap-2.5">
          {hasDocuments && (
            <button
              onClick={handleExtractDetails}
              disabled={extracting}
              className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink transition-colors disabled:opacity-50"
              title="Extract details from uploaded documents"
            >
              {extracting
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              {extracting ? 'Extracting…' : 'Extract'}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      </div>

      {isAiPopulated && (
        <div className="flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/15 px-2.5 py-1.5">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11.5px] text-primary/80">AI populated — review and edit if needed</span>
        </div>
      )}

      <dl className="space-y-2.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70 pt-1">Dates</p>
        <Row label="Start date" value={fmtDate(contract.startDate)} faint={!contract.startDate} />
        <Row label="End date" value={fmtDate(contract.endDate)} faint={!contract.endDate} />
        <Row
          label="Notice period"
          value={contract.noticePeriodDays != null ? `${contract.noticePeriodDays} days` : '—'}
          faint={contract.noticePeriodDays == null}
        />
        <Row
          label="Notice by"
          value={
            displayNoticeDeadline
              ? <span className={cn(
                  'font-medium',
                  !contract.noticeDeadline && 'italic text-muted'
                )}>
                  {fmtDate(displayNoticeDeadline)}
                  {!contract.noticeDeadline && contract.noticePeriodDays && (
                    <span className="ml-1 text-[11px] text-faint not-italic">(calc.)</span>
                  )}
                </span>
              : '—'
          }
          faint={!displayNoticeDeadline}
        />

        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70 pt-1">Renewal</p>
        <Row
          label="Auto-renewal"
          value={contract.autoRenewal
            ? `Yes${contract.autoRenewalMonths ? ` · ${contract.autoRenewalMonths} months` : ''}`
            : 'No'}
        />

        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70 pt-1">Financial</p>
        <Row label="Annual value" value={fmtCurrency(contract.annualValue, contract.currency)} faint={!contract.annualValue || contract.annualValue === '0'} />
        <Row label="Monthly value" value={fmtCurrency(contract.monthlyValue, contract.currency)} faint={!contract.monthlyValue || contract.monthlyValue === '0'} />
        <Row label="Currency" value={contract.currency} />

        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted/70 pt-1">Other</p>
        <Row label="Perspective" value={contract.perspective.charAt(0).toUpperCase() + contract.perspective.slice(1)} />
      </dl>
    </div>
  )
}
