'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type PeriodFilter = 'month' | 'quarter' | 'year' | 'all'

const OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: 'month',   label: 'This month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year' },
  { key: 'all',     label: 'All time' },
]

export function ScorecardFilter({ current }: { current: PeriodFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const set = (key: PeriodFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
      {OPTIONS.map(o => (
        <button
          key={o.key}
          onClick={() => set(o.key)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            current === o.key
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-soft hover:bg-hover'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
