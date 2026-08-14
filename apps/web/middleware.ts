import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes — no authentication required
const PUBLIC_PATHS = [
  '/',             // landing page
  '/about',        // public about page (also beta-gate exempt)
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/confirm',
  '/portal',       // vendor submission via magic link
  '/api/portal/',  // vendor portal API (token-authenticated)
  '/invite',       // team invitation acceptance
  '/api/invite/',  // invitation acceptance API
  '/api/auth/',    // auth API routes (signup, signout)
  '/api/waitlist', // waitlist form submission
  '/api/stripe/',  // Stripe webhooks (signature-verified)
]

// Beta gate — when BETA_GATE_PASSWORD is set, the whole site sits behind a
// shared password. Token-protected flows (cron, vendor portal, invitations) are
// exempt so they still work for external testers. Unset the env var to remove
// the gate entirely.
const BETA_EXEMPT_PREFIXES = ['/beta', '/about', '/api/beta', '/api/cron', '/api/stripe', '/api/waitlist', '/portal', '/api/portal', '/invite', '/api/invite']

export async function middleware(request: NextRequest) {
  const { pathname: earlyPath } = request.nextUrl

  const betaPassword = process.env.BETA_GATE_PASSWORD
  if (betaPassword) {
    const hasBetaAccess = request.cookies.get('viq_beta')?.value === betaPassword
    // '/' and '/about' stay public — marketing pages; the app itself is gated.
    const isExempt = earlyPath === '/' || earlyPath === '/about'
      || BETA_EXEMPT_PREFIXES.some(p => earlyPath === p || earlyPath.startsWith(p + '/') || earlyPath.startsWith(p))
    if (!hasBetaAccess && !isExempt) {
      const url = request.nextUrl.clone()
      url.pathname = '/beta'
      url.searchParams.set('next', earlyPath)
      return NextResponse.redirect(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session — must be called before checking user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated user trying to access a protected route
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user hitting login/signup — redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Root — logged-in users go straight to the app; everyone else sees the
  // marketing landing page (public even while the beta gate is on — the app
  // routes themselves stay gated).
  if (pathname === '/') {
    if (user) {
      const target = request.nextUrl.clone()
      target.pathname = '/dashboard'
      return NextResponse.redirect(target)
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
