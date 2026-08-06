import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc } from '@contractly/db'
import { router, viewerProcedure, managerProcedure } from '../trpc'
import { vendors } from '@contractly/db/schema'
import { assertCanCreate } from '@/lib/billing/limits'
import { createVendorSchema, updateVendorSchema } from '@/lib/schemas/vendors'

export { createVendorSchema, updateVendorSchema }

// ─── Router ───────────────────────────────────────────────────────────────────

export const vendorsRouter = router({
  // List all vendors for the authenticated org (excludes soft-deleted)
  list: viewerProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.orgId, ctx.user.orgId), isNull(vendors.deletedAt)))
      .orderBy(desc(vendors.createdAt))

    return results
  }),

  // Get a single vendor — verifies it belongs to the authenticated org
  get: viewerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [vendor] = await ctx.db
        .select()
        .from(vendors)
        .where(
          and(
            eq(vendors.id, input.id),
            eq(vendors.orgId, ctx.user.orgId),
            isNull(vendors.deletedAt)
          )
        )
        .limit(1)

      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' })
      }

      return vendor
    }),

  // Create a vendor — enforces plan vendor limits
  create: managerProcedure.input(createVendorSchema).mutation(async ({ ctx, input }) => {
    // Plan limits + free-tier expiry
    await assertCanCreate(ctx.user.orgId, 'vendor')

    const [vendor] = await ctx.db
      .insert(vendors)
      .values({
        ...input,
        orgId: ctx.user.orgId,
        abn: input.abn || null,
        contactName: input.contactName || null,
        contactEmail: input.contactEmail || null,
        submissionEmail: input.submissionEmail || null,
      })
      .returning()

    return vendor
  }),

  // Update a vendor — verifies ownership
  update: managerProcedure.input(updateVendorSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input

    // Verify ownership before update
    const [existing] = await ctx.db
      .select()
      .from(vendors)
      .where(
        and(eq(vendors.id, id), eq(vendors.orgId, ctx.user.orgId), isNull(vendors.deletedAt))
      )
      .limit(1)

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' })
    }

    const [updated] = await ctx.db
      .update(vendors)
      .set({
        ...data,
        abn: data.abn || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        submissionEmail: data.submissionEmail || null,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning()

    return updated
  }),

  // Soft delete — preserves audit trail
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(vendors)
        .where(
          and(
            eq(vendors.id, input.id),
            eq(vendors.orgId, ctx.user.orgId),
            isNull(vendors.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' })
      }

      await ctx.db
        .update(vendors)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(vendors.id, input.id))

      return { success: true }
    }),
})
