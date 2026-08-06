'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, FileText, TrendingUp, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { api } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

const KIND_META = {
  vendor:   { icon: Building2,  label: 'Vendors' },
  contract: { icon: FileText,   label: 'Contracts' },
  kpi:      { icon: TrendingUp, label: 'KPIs' },
} as const

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Debounce keystrokes so we don't query on every character.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  // Reset state when the palette closes.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebounced('')
      setActiveIndex(0)
    }
  }, [open])

  const { data: results, isFetching } = api.search.query.useQuery(
    { q: debounced },
    { enabled: open && debounced.trim().length > 0, staleTime: 30_000, placeholderData: (prev) => prev }
  )

  const flat = useMemo(() => results ?? [], [results])

  useEffect(() => {
    setActiveIndex(0)
  }, [flat.length, debounced])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flat[activeIndex]) {
      e.preventDefault()
      go(flat[activeIndex].href)
    }
  }

  // Group for display while keeping flat order for keyboard nav.
  const groups = useMemo(() => {
    const g: Record<string, typeof flat> = {}
    for (const r of flat) (g[r.kind] ??= []).push(r)
    return g
  }, [flat])

  let runningIndex = -1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[520px] p-0 gap-0 overflow-hidden bg-surface border-border shadow-hero">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-faint shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search vendors, contracts, KPIs…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint outline-none"
          />
          {isFetching && <Loader2 className="h-4 w-4 text-faint animate-spin" />}
        </div>

        <div ref={listRef} className="max-h-[380px] overflow-y-auto">
          {debounced.trim().length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Type to search your vendors, contracts and KPIs.
            </div>
          ) : flat.length === 0 && !isFetching ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No matches for &ldquo;{debounced}&rdquo;
            </div>
          ) : (
            (['vendor', 'contract', 'kpi'] as const).map(kind => {
              const items = groups[kind]
              if (!items || items.length === 0) return null
              const Meta = KIND_META[kind]
              return (
                <div key={kind} className="py-1.5">
                  <div className="px-4 py-1 text-[10.5px] font-bold uppercase tracking-eyebrow text-muted">
                    {Meta.label}
                  </div>
                  {items.map(item => {
                    runningIndex += 1
                    const idx = runningIndex
                    const Icon = Meta.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => go(item.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          idx === activeIndex ? 'bg-primary-50' : 'hover:bg-hover'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                          idx === activeIndex ? 'bg-primary text-white' : 'bg-hover text-ink-soft'
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-ink truncate">{item.title}</div>
                          <div className="text-[11.5px] text-muted truncate capitalize">{item.subtitle}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-border-soft text-[11px] text-faint">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
