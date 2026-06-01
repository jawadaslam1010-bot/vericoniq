'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Tab = {
  id: string
  label: string
  href: string
  count?: number
}

export function VendorTabBar({
  vendorId,
  tabs,
}: {
  vendorId: string
  tabs: Tab[]
}) {
  const pathname = usePathname()

  function isActive(tab: Tab) {
    if (tab.id === 'overview') {
      return pathname === `/vendors/${vendorId}`
    }
    return pathname.startsWith(`/vendors/${vendorId}/${tab.id}`)
  }

  return (
    <div className="flex items-end gap-0 border-b border-border-soft mt-5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
      {tabs.map((tab) => {
        const active = isActive(tab)
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 pb-3 pt-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-180 shrink-0',
              active
                ? 'text-ink border-b-2 border-primary'
                : 'text-muted hover:text-ink-soft'
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-bold px-1',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-border text-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
