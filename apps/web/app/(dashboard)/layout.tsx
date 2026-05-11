export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { Navigation } from '@/components/shared/Navigation'

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
    // Auth user exists but no profile — likely signup DB tx failed
    redirect('/login?error=no_profile')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={{
          id: authUser.id,
          email: authUser.email!,
          fullName: userRecord.fullName,
          role: userRecord.role as 'admin' | 'manager' | 'viewer',
          orgId: userRecord.orgId,
        }}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
