'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, FileText, Inbox, Grid } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard',  label: 'Home',      icon: LayoutDashboard, exact: true },
  { href: '/vendors',    label: 'Vendors',   icon: Building2 },
  { href: '/contracts',  label: 'Contracts', icon: FileText },
  { href: '/inbox',      label: 'Inbox',     icon: Inbox },
  { href: '/more',       label: 'More',      icon: Grid },
]

export function MobileTabBar() {
  const pathname = usePathname()

  function isActive(tab: typeof TABS[number]) {
    if (tab.exact) return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  return (
    <nav className="md:hidden flex items-center justify-around h-16 pb-2 border-t border-border bg-surface shrink-0">
      {TABS.map((tab) => {
        const active = isActive(tab)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5 min-w-[50px] text-[10.5px] font-semibold transition-colors',
              active ? 'text-primary' : 'text-muted'
            )}
          >
            <Icon className={cn('h-[22px] w-[22px]', active ? 'stroke-[1.9]' : 'stroke-[1.6]')} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
