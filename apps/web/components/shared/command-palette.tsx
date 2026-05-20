'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function CommandPalette() {
  const [open, setOpen] = useState(false)

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[520px] p-0 gap-0 overflow-hidden bg-surface border-border shadow-hero">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-faint shrink-0" />
          <input
            autoFocus
            placeholder="Search vendors, contracts, KPIs…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint outline-none"
          />
        </div>
        <div className="px-4 py-8 text-center text-sm text-muted">
          Search coming soon
        </div>
      </DialogContent>
    </Dialog>
  )
}
