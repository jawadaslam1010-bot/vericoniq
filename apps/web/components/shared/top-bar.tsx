'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Bell, ChevronRight, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommandPalette } from './command-palette'
import type { SessionUser } from '@contractly/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Derive breadcrumbs from pathname — UUIDs are kept for href building but hidden from labels
function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const LABELS: Record<string, string> = {
    dashboard:   'Dashboard',
    vendors:     'Vendors',
    contracts:   'Contracts',
    kpis:        'KPIs',
    scorecard:   'Scorecard',
    submissions: 'Submissions',
    breaches:    'Breaches',
    documents:   'Documents',
    activity:    'Activity',
    new:         'New',
    settings:    'Settings',
  }

  // Build hrefs incrementally, skipping UUID segments in labels but keeping them in paths
  const crumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    if (UUID_RE.test(seg)) continue   // UUID: include in path but skip as its own crumb
    crumbs.push({ label: LABELS[seg] ?? seg, href: path })
  }
  return crumbs
}

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter()
  const breadcrumbs = useBreadcrumbs()
  const supabase = createClient()

  const initials = user.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-30 h-[58px] flex items-center gap-4 px-4 md:px-6 bg-page border-b border-border shrink-0">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[13.5px] min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-faint shrink-0" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-ink truncate">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted hover:text-ink transition-colors duration-150 shrink-0"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </div>

        {/* Command palette trigger (desktop) */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="hidden md:flex flex-1 max-w-[480px] mx-auto items-center gap-2.5 h-[34px] px-3 rounded-lg border border-border bg-surface text-[13px] text-muted hover:border-primary/40 transition-colors duration-180 cursor-pointer"
        >
          <Search className="h-[15px] w-[15px] text-faint shrink-0" />
          <span className="flex-1 text-left">Search vendors, contracts, KPIs…</span>
          <span className="flex items-center gap-0.5 ml-auto">
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-page text-muted">⌘</kbd>
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border bg-page text-muted">K</kbd>
          </span>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          {/* Bell */}
          <button className="relative w-[34px] h-[34px] rounded-lg flex items-center justify-center text-ink-soft hover:bg-hover transition-colors duration-180">
            <Bell className="h-[17px] w-[17px]" />
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-hover transition-colors duration-180 outline-none ml-1">
                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-[12px] text-white"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #1a2b29)' }}>
                  {initials}
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-[12.5px] font-semibold text-ink">{user.fullName ?? user.email}</div>
                  <div className="text-[11px] text-muted capitalize">{user.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-surface border-border">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-ink truncate">{user.email}</p>
                <p className="text-xs text-muted capitalize">{user.role}</p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center gap-2 text-ink-soft cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
