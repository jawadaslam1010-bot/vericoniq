export const dynamic = 'force-dynamic'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import Link from 'next/link'
import { Shield, LayoutGrid, ScrollText, LogOut } from 'lucide-react'

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 404s if not a platform admin — never renders for unauthorised users
  const adminEmail = await requirePlatformAdmin()

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-[#17171a] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[14px] text-white">VericonIQ</span>
            <span className="text-white/30 text-[13px]">/</span>
            <span className="text-[13px] font-semibold text-violet-400">Platform Admin</span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Orgs
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Audit log
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/40">{adminEmail}</span>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
