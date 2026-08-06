/**
 * Platform admin utilities — server-side only.
 * Never import this in client components.
 */
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@contractly/db'
import { platformAuditLog } from '@contractly/db/schema'

const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Verifies the current Supabase session belongs to a platform admin.
 * Returns the admin email, or calls notFound() (404) if not authorised.
 * Using 404 instead of 403 deliberately — don't confirm /admin exists to non-admins.
 */
export async function requirePlatformAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) notFound()
  if (!PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase())) notFound()

  return user.email
}

/**
 * Write an entry to platform_audit_log.
 * Fire-and-forget — never throws, so a logging failure never blocks a page.
 */
export async function logPlatformAction(opts: {
  adminEmail: string
  action: string
  targetOrgId?: string
  targetUserId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim()
      ?? headersList.get('x-real-ip')
      ?? null

    await db.insert(platformAuditLog).values({
      adminEmail: opts.adminEmail,
      action: opts.action,
      targetOrgId: opts.targetOrgId ?? null,
      targetUserId: opts.targetUserId ?? null,
      metadata: opts.metadata ?? null,
      ipAddress: ip,
    })
  } catch (err) {
    console.error('[platform-admin] audit log write failed:', err)
  }
}
