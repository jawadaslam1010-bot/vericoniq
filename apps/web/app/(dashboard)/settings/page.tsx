export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import type { Metadata } from 'next'
import { SettingsClient } from './SettingsClient'

export const metadata: Metadata = { title: 'Settings · VericonIQ' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const [userRecord] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!userRecord) redirect('/login')

  const role = userRecord.role as 'admin' | 'manager' | 'viewer'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-serif text-[28px] text-ink tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted mt-1">Manage your organisation profile and team.</p>
      </div>
      <SettingsClient currentRole={role} />
    </div>
  )
}
