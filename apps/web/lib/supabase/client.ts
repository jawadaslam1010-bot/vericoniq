import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client — safe to use in Client Components
// Uses the public anon key only — all data access enforced by RLS
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
