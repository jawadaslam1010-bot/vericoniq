import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles:
// 1. Magic link logins
// 2. Email confirmation after signup
// 3. OAuth callbacks (future)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }

    console.error('Auth callback error:', error)
  }

  // Redirect to login with error on failure
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
