import { initTRPC, TRPCError } from '@trpc/server'
import { type NextRequest } from 'next/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { db } from '@contractly/db'
import { users } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import type { UserRole } from '@contractly/types'

// ─── Context ─────────────────────────────────────────────────────────────────

export type TRPCContext = {
  db: typeof db
  user: {
    id: string
    email: string
    orgId: string
    role: UserRole
    fullName: string | null
  } | null
  req: NextRequest
}

export async function createTRPCContext(opts: { req: NextRequest }): Promise<TRPCContext> {
  const { req } = opts

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {
          // Read-only in tRPC context — middleware handles cookie refresh
        },
      },
    }
  )

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { db, user: null, req }
  }

  // Fetch role and org from our users table
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!userRecord) {
    return { db, user: null, req }
  }

  return {
    db,
    user: {
      id: authUser.id,
      email: authUser.email!,
      orgId: userRecord.orgId,
      role: userRecord.role as UserRole,
      fullName: userRecord.fullName,
    },
    req,
  }
}

// ─── tRPC init ────────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// ─── Procedures ───────────────────────────────────────────────────────────────

export const router = t.router
export const publicProcedure = t.procedure

// Requires valid session
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

// Role hierarchy: admin > manager > viewer
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
}

function requireRole(minimumRole: UserRole) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userLevel = ROLE_HIERARCHY[ctx.user.role]
    const requiredLevel = ROLE_HIERARCHY[minimumRole]
    if (userLevel < requiredLevel) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minimumRole} access`,
      })
    }
    return next({ ctx })
  })
}

export const viewerProcedure = requireRole('viewer')
export const managerProcedure = requireRole('manager')
export const adminProcedure = requireRole('admin')
