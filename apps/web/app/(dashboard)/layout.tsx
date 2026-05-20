export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { Sidebar } from '@/components/shared/sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { MobileTabBar } from '@/components/shared/mobile-tab-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!userRecord) {
    redirect('/login?error=no_profile')
  }

  const sessionUser = {
    id: authUser.id,
    email: authUser.email!,
    fullName: userRecord.fullName,
    role: userRecord.role as 'admin' | 'manager' | 'viewer',
    orgId: userRecord.orgId,
  }

  return (
    // Desktop: sidebar left, content right
    // Mobile: top bar, scrollable content, bottom tab bar
    <div className="flex h-screen overflow-hidden bg-page">

      {/* Icon-rail sidebar — hidden on mobile */}
      <Sidebar />

      {/* Right column: top bar + scrollable main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar user={sessionUser} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <MobileTabBar />
      </div>
    </div>
  )
}
