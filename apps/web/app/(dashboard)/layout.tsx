export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users, organisations } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { planHasFeature } from '@contractly/types'
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

  // Load org — used for the impersonation banner and free-tier expiry notice
  const [orgRecord] = await db
    .select({ name: organisations.name, plan: organisations.plan, trialEndsAt: organisations.trialEndsAt })
    .from(organisations)
    .where(eq(organisations.id, userRecord.orgId))
    .limit(1)

  // Free-tier expiry notice (starter plans only)
  let trialNotice: { kind: 'expired' | 'ending'; days: number } | null = null
  if (orgRecord?.plan === 'starter' && orgRecord.trialEndsAt) {
    const days = Math.ceil((new Date(orgRecord.trialEndsAt).getTime() - Date.now()) / 86_400_000)
    if (days < 0) trialNotice = { kind: 'expired', days: 0 }
    else if (days <= 14) trialNotice = { kind: 'ending', days }
  }

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

      {/* Free-tier expiry notice */}
      {trialNotice && !impersonation && (
        <div className={`w-full px-4 py-2 text-[12.5px] text-center ${
          trialNotice.kind === 'expired'
            ? 'bg-status-breach-bg text-status-breach-text'
            : 'bg-status-risk-bg text-status-risk-text'
        }`}>
          {trialNotice.kind === 'expired'
            ? 'Your free tier has ended — your data is read-only. '
            : `Your free tier ends in ${trialNotice.days} day${trialNotice.days !== 1 ? 's' : ''}. `}
          <a href="/settings" className="font-semibold underline underline-offset-2">Upgrade to Pro</a>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Icon-rail sidebar — hidden on mobile. Locked nav items show a padlock. */}
        <Sidebar
          lockedIds={planHasFeature(orgRecord?.plan ?? 'starter', 'reports') ? [] : ['reports']}
        />

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
