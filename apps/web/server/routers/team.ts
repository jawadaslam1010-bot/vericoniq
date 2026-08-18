import { router, viewerProcedure, adminProcedure } from '../trpc'
import { users, organisations, invitations } from '@contractly/db/schema'
import { eq, and, desc } from '@contractly/db'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'
import { planHasFeature } from '@contractly/types'
import { createAdminClient } from '@/lib/supabase/server'
import { sendInvitation } from '@/lib/email'

const roleEnum = z.enum(['admin', 'manager', 'viewer'])

export const teamRouter = router({
  // ── Org profile ────────────────────────────────────────────────────────────
  getOrg: viewerProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, ctx.user.orgId))
      .limit(1)
    return org ?? null
  }),

  updateOrg: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      abn: z.string().regex(/^\d{11}$/).nullable().optional(),
      industry: z.string().max(120).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(organisations)
        .set({
          name: input.name,
          abn: input.abn ?? null,
          industry: input.industry ?? null,
          updatedAt: new Date(),
        })
        .where(eq(organisations.id, ctx.user.orgId))
      return { success: true }
    }),

  // ── List org members (with emails from auth) ───────────────────────────────
  listMembers: viewerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: users.id, fullName: users.fullName, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.orgId, ctx.user.orgId))
      .orderBy(desc(users.createdAt))

    const admin = await createAdminClient()
    const members = await Promise.all(rows.map(async r => {
      let email: string | null = null
      try {
        const { data } = await admin.auth.admin.getUserById(r.id)
        email = data?.user?.email ?? null
      } catch { /* ignore */ }
      return { ...r, email, isSelf: r.id === ctx.user.id }
    }))

    return members
  }),

  // ── List pending invitations ───────────────────────────────────────────────
  listInvitations: viewerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.orgId, ctx.user.orgId), eq(invitations.status, 'pending')))
      .orderBy(desc(invitations.createdAt))
  }),

  // ── Invite a teammate ──────────────────────────────────────────────────────
  invite: adminProcedure
    .input(z.object({ email: z.string().email(), role: roleEnum }))
    .mutation(async ({ ctx, input }) => {
      // Team invitations are a paid feature.
      const [orgPlan] = await ctx.db
        .select({ plan: organisations.plan })
        .from(organisations)
        .where(eq(organisations.id, ctx.user.orgId))
        .limit(1)
      if (!planHasFeature(orgPlan?.plan ?? 'starter', 'teamInvites')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Team invitations are available on the Essentials plan and above. Upgrade in Settings to invite your colleagues.',
        })
      }

      const email = input.email.trim().toLowerCase()

      // Reject a duplicate pending invitation for the same email.
      const [dupe] = await ctx.db
        .select({ id: invitations.id })
        .from(invitations)
        .where(and(
          eq(invitations.orgId, ctx.user.orgId),
          eq(invitations.email, email),
          eq(invitations.status, 'pending'),
        ))
        .limit(1)
      if (dupe) throw new TRPCError({ code: 'CONFLICT', message: 'An invitation is already pending for this email' })

      const token = `inv_${randomBytes(24).toString('hex')}`
      const expiresAt = new Date(Date.now() + 7 * 86_400_000)

      const [created] = await ctx.db
        .insert(invitations)
        .values({
          orgId: ctx.user.orgId,
          email,
          role: input.role,
          token,
          invitedBy: ctx.user.id,
          status: 'pending',
          expiresAt,
        })
        .returning()

      // Send the invite email (best-effort — do not fail the mutation on email error).
      try {
        const [org] = await ctx.db
          .select({ name: organisations.name })
          .from(organisations)
          .where(eq(organisations.id, ctx.user.orgId))
          .limit(1)
        await sendInvitation({
          to: email,
          orgName: org?.name ?? 'your organisation',
          inviterName: ctx.user.fullName ?? 'A teammate',
          role: input.role,
          token,
        })
      } catch (err) {
        console.error('[team/invite] email send failed:', err)
      }

      return { id: created.id, email: created.email, role: created.role }
    }),

  // ── Revoke a pending invitation ────────────────────────────────────────────
  revokeInvitation: adminProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(invitations)
        .set({ status: 'revoked' })
        .where(and(eq(invitations.id, input.invitationId), eq(invitations.orgId, ctx.user.orgId)))
      return { success: true }
    }),

  // ── Change a member's role ─────────────────────────────────────────────────
  changeRole: adminProcedure
    .input(z.object({ userId: z.string().uuid(), role: roleEnum }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.orgId, ctx.user.orgId)))
        .limit(1)
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' })

      // Guard: never leave an org without an admin.
      if (target.role === 'admin' && input.role !== 'admin') {
        const admins = await ctx.db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.orgId, ctx.user.orgId), eq(users.role, 'admin')))
        if (admins.length <= 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your organisation must keep at least one admin' })
        }
      }

      await ctx.db.update(users).set({ role: input.role }).where(eq(users.id, input.userId))
      return { success: true }
    }),

  // ── Remove a member from the org ───────────────────────────────────────────
  removeMember: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot remove yourself' })
      }
      const [target] = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.orgId, ctx.user.orgId)))
        .limit(1)
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' })

      if (target.role === 'admin') {
        const admins = await ctx.db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.orgId, ctx.user.orgId), eq(users.role, 'admin')))
        if (admins.length <= 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your organisation must keep at least one admin' })
        }
      }

      // Remove org access by deleting the profile row. The auth account remains
      // but can no longer resolve to an org (it is redirected to login).
      await ctx.db.delete(users).where(eq(users.id, input.userId))
      return { success: true }
    }),
})
