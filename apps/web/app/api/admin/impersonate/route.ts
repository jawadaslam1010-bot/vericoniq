export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { logPlatformAction } from '@/lib/platform-admin'
import { cookies } from 'next/headers'

const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function POST(req: NextRequest) {
  // Verify platform admin session
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.email || !PLATFORM_ADMIN_EMAILS.includes(authUser.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Store impersonation context in a server-side cookie
  // The dashboard layout checks this cookie and loads that user's org context
  const cookieStore = await cookies()
  cookieStore.set('__viq_impersonate', JSON.stringify({
    userId: target.id,
    orgId: target.orgId,
    adminEmail: authUser.email,
    startedAt: new Date().toISOString(),
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })

  // Log the action
  await logPlatformAction({
    adminEmail: authUser.email,
    action: 'user.impersonated',
    targetOrgId: target.orgId,
    targetUserId: target.id,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  // Exit impersonation
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.email || !PLATFORM_ADMIN_EMAILS.includes(authUser.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.delete('__viq_impersonate')

  await logPlatformAction({
    adminEmail: authUser.email,
    action: 'user.impersonation_ended',
  })

  return NextResponse.json({ success: true })
}
