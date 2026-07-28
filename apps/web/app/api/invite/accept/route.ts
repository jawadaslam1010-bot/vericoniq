export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@contractly/db'
import { invitations, users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { createAdminClient } from '@/lib/supabase/server'

const acceptSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().min(2).max(200),
  password: z.string().min(12),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = acceptSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    const { token, fullName, password } = parsed.data

    const [invite] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1)
    if (!invite || invite.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation is no longer valid', code: 'INVALID' }, { status: 404 })
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired', code: 'EXPIRED' }, { status: 410 })
    }

    const supabase = await createAdminClient()

    // Create the auth account for the invited email.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData?.user) {
      const already = authError?.message?.toLowerCase().includes('already') ?? false
      return NextResponse.json(
        {
          error: already
            ? 'An account already exists for this email. Please ask your administrator to add you directly.'
            : 'Failed to create your account',
          code: already ? 'EMAIL_EXISTS' : 'AUTH_ERROR',
        },
        { status: already ? 409 : 500 }
      )
    }

    // Create the profile row in the invited org, then mark the invite accepted.
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      org_id: invite.orgId,
      full_name: fullName,
      role: invite.role,
    })

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('[invite/accept] profile creation failed:', userError)
      return NextResponse.json({ error: 'Failed to set up your access', code: 'DB_ERROR' }, { status: 500 })
    }

    await db
      .update(invitations)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(invitations.id, invite.id))

    return NextResponse.json({ success: true, email: invite.email })
  } catch (err) {
    console.error('[invite/accept] error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
