export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, organisations } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { Sidebar } from '@/components/shared/sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { MobileTabBar } from '@/components/shared/mobile-tab-bar'
import { ImpersonationBanner } from '@/components/shared/impersonation-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  // ── Impersonation ──────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const impersonateCookie = cookieStore.get('__viq_impersonate')?.value

  let impersonation: { userId: string; orgId: string; adminEmail: string } | null = null
  if (impersonateCookie) {
    try {
      const parsed = JSON.parse(impersonateCookie)
      // Only honour if the current auth session belongs to a platform admin
      const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      if (authUser.email && PLATFORM_ADMIN_EMAILS.includes(authUser.email.toLowerCase())) {
        impersonation = parsed
      }
    } catch { /* ignore malformed cookie */ }
  }

  // Load the effective user — real or impersonated
  const effectiveUserId = impersonation?.userId ?? authUser.id

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, effectiveUserId))
    .limit(1)

  if (!userRecord) {
    if (impersonation) {
      // Impersonation target no longer exists — clear cookie and reload
      redirect('/api/admin/impersonate?clear=1')
    }
    redirect('/login?error=no_profile')
  }

  // Load org for impersonation banner
  const [orgRecord] = impersonation
    ? await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, userRecord.orgId)).limit(1)
    : [null]

  const sessionUser = {
    id: userRecord.id,
    email: impersonation ? `${userRecord.fullName ?? userRecord.id}` : authUser.email!,
    fullName: userRecord.fullName,
    role: userRecord.role as 'admin' | 'manager' | 'viewer',
    orgId: userRecord.orgId,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page flex-col">
      {/* Impersonation warning banner */}
      {impersonation && (
        <ImpersonationBanner
          viewingAs={userRecord.fullName ?? 'Unknown user'}
          orgName={orgRecord?.name ?? 'Unknown org'}
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
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
    </div>
  )
}
