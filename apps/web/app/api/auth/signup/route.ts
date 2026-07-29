export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

const signupSchema = z.object({
  orgName: z.string().min(2).max(200),
  abn: z.string().regex(/^\d{11}$/).nullable().optional(),
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(12),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { orgName, abn, fullName, email, password } = parsed.data
    const supabase = await createAdminClient()

    // Require email verification only when explicitly enabled (needs Supabase SMTP
    // configured). Defaults to auto-confirm so signup keeps working out of the box.
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: !requireEmailVerification,
      user_metadata: { full_name: fullName },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists', code: 'EMAIL_EXISTS' },
          { status: 409 }
        )
      }
      console.error('Auth user creation failed:', authError)
      return NextResponse.json(
        { error: 'Failed to create account', code: 'AUTH_ERROR' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account', code: 'AUTH_ERROR' },
        { status: 500 }
      )
    }

    // 2. Create organisation using Supabase Admin API (bypasses RLS)
    // Free tier expires 3 months after signup (PLAN_LIMITS.starter.expiryMonths)
    const trialEndsAt = new Date()
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 3)

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: orgName,
        abn: abn ?? null,
        plan: 'starter',
        org_type: 'buyer',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single()

    if (orgError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('Organisation creation failed:', orgError)
      return NextResponse.json(
        { error: 'Failed to set up your account. Please try again.', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    // 3. Create user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        org_id: org.id,
        full_name: fullName,
        role: 'admin', // First user in an org is always admin
      })

    if (userError) {
      // Clean up org and auth user
      await supabase.from('organisations').delete().eq('id', org.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('User profile creation failed:', userError)
      return NextResponse.json(
        { error: 'Failed to set up your account. Please try again.', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation: requireEmailVerification,
    })
  } catch (error) {
    console.error('Signup route error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
