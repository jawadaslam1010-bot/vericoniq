'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  FileText,
  TrendingUp,
  BarChart2,
  Inbox,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'dashboard', href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { id: 'vendors',   href: '/vendors',    label: 'Vendors',    icon: Building2 },
  { id: 'contracts', href: '/contracts',  label: 'Contracts',  icon: FileText },
  { id: 'kpis',      href: '/kpis',       label: 'KPIs & SLA', icon: TrendingUp },
  { id: 'reports',   href: '/reports',    label: 'Reports',    icon: BarChart2 },
  { id: 'inbox',     href: '/inbox',      label: 'Inbox',      icon: Inbox },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(item: typeof NAV_ITEMS[number]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="hidden md:flex flex-col w-[60px] shrink-0 sticky top-0 h-screen bg-page border-r border-border">
      {/* Brand mark */}
      <div className="flex items-center justify-center h-[58px] shrink-0">
        <Link href="/dashboard" title="VericonIQ">
          <div className="w-[30px] h-[30px] rounded-lg bg-primary flex items-center justify-center font-serif text-white text-[17px] leading-none select-none">
            V
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-0.5 flex-1 px-[10px] py-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-180',
                active
                  ? 'bg-primary-50 text-primary'
                  : 'text-ink-soft hover:bg-hover hover:text-ink'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', active && 'stroke-[1.9]')} />
              <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 translate-x-[-4px] transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 shadow-md">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="flex items-center justify-center pb-4 px-[10px]">
        <Link
          href="/settings"
          className="group relative w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:bg-hover hover:text-ink transition-colors duration-180"
        >
          <Settings className="h-[18px] w-[18px]" />
          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 translate-x-[-4px] transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 shadow-md">
            Settings
          </span>
        </Link>
      </div>
    </aside>
  )
}
