'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'

interface Props {
  contractId: string
  vendorId: string
  label?: string
}

export function NewPeriodButton({ contractId, vendorId, label = 'New period' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [dueDate, setDueDate] = useState('')

  const createMutation = api.submissions.createPeriod.useMutation({
    onSuccess: (period) => {
      toast.success('Period created')
      setOpen(false)
      router.push(`/vendors/${vendorId}/contracts/${contractId}/submissions/${period.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  // Auto-fill helpers
  const handlePeriodStartChange = (val: string) => {
    setPeriodStart(val)
    if (val) {
      // Default end = last day of same month
      const d = new Date(val)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      setPeriodEnd(end.toISOString().split('T')[0])
      // Default due = 5th of next month
      const due = new Date(d.getFullYear(), d.getMonth() + 1, 5)
      setDueDate(due.toISOString().split('T')[0])
    }
  }

  // Which KPI cadences are due based on period end month
  const cadencesIncluded = (() => {
    if (!periodEnd) return null
    const month = new Date(periodEnd).getMonth() + 1
    const isQ = [3, 6, 9, 12].includes(month)
    const isY = [6, 12].includes(month)
    const list = ['Weekly', 'Monthly']
    if (isQ) list.push('Quarterly')
    if (isY) list.push('Annual')
    return list
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodStart || !periodEnd || !dueDate) {
      toast.error('Please fill in all date fields')
      return
    }
    createMutation.mutate({ contractId, periodStart, periodEnd, dueDate })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-ink mb-1">New submission period</h2>
        <p className="text-sm text-muted mb-5">
          Creates blank result entries for all active KPIs in this period.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Period start</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => handlePeriodStartChange(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Period end</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Vendor submission due by</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted mt-1">Defaults to 5th of the following month</p>
          </div>
          {cadencesIncluded && (
            <div className="rounded-md bg-primary/5 border border-primary/15 px-3 py-2.5">
              <p className="text-[12px] text-primary font-medium">KPIs included in this period:</p>
              <p className="text-[12px] text-primary/80 mt-0.5">{cadencesIncluded.join(', ')}</p>
              {!cadencesIncluded.includes('Quarterly') && (
                <p className="text-[11px] text-muted mt-1">Quarterly KPIs appear in Mar, Jun, Sep, Dec periods only.</p>
              )}
              {!cadencesIncluded.includes('Annual') && (
                <p className="text-[11px] text-muted">Annual KPIs appear in Jun and Dec periods only.</p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : 'Create period'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
