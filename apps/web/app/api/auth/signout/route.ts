export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Redirect on the same origin the request came from — an env-based absolute
  // URL is cross-origin from previews/dev ports and breaks fetch() callers.
  return NextResponse.redirect(new URL('/login', req.url))
}
