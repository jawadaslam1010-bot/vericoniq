import { router, viewerProcedure, managerProcedure } from '../trpc'
import { contractKeyTerms, contracts } from '@contractly/db/schema'
import { eq, and } from '@contractly/db'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

// ─── Router ───────────────────────────────────────────────────────────────────

export const keyTermsRouter = router({
  // List all key terms for a contract — verifies contract belongs to org
  list: viewerProcedure
    .input(z.object({ contractId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select()
        .from(contractKeyTerms)
        .where(
          and(
            eq(contractKeyTerms.contractId, input.contractId),
            eq(contractKeyTerms.orgId, ctx.user.orgId)
          )
        )

      return results
    }),

  // Bulk replace all key terms for a contract
  bulkUpsert: managerProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        terms: z.array(
          z.object({
            termType: z.enum(['date', 'obligation', 'liability', 'payment', 'dispute', 'termination']),
            label: z.string(),
            value: z.string(),
            clauseRef: z.string().nullable().optional(),
            isAiFlagged: z.boolean().default(false),
            flagReason: z.string().nullable().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the contract belongs to the authenticated org
      const [contract] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(
          and(
            eq(contracts.id, input.contractId),
            eq(contracts.orgId, ctx.user.orgId)
          )
        )
        .limit(1)

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })
      }

      // Delete existing key terms for this contract
      await ctx.db
        .delete(contractKeyTerms)
        .where(
          and(
            eq(contractKeyTerms.contractId, input.contractId),
            eq(contractKeyTerms.orgId, ctx.user.orgId)
          )
        )

      // Insert all new terms if any provided
      if (input.terms.length === 0) {
        return { count: 0 }
      }

      const inserted = await ctx.db
        .insert(contractKeyTerms)
        .values(
          input.terms.map((term) => ({
            contractId: input.contractId,
            orgId: ctx.user.orgId,
            termType: term.termType,
            label: term.label,
            value: term.value,
            clauseRef: term.clauseRef ?? null,
            isAiFlagged: term.isAiFlagged,
            flagReason: term.flagReason ?? null,
          }))
        )
        .returning({ id: contractKeyTerms.id })

      return { count: inserted.length }
    }),

  // Update a single key term — verifies it belongs to org via orgId
  update: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        value: z.string().optional(),
        isAiFlagged: z.boolean().optional(),
        flagReason: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify the term belongs to the authenticated org
      const [existing] = await ctx.db
        .select({ id: contractKeyTerms.id })
        .from(contractKeyTerms)
        .where(
          and(
            eq(contractKeyTerms.id, id),
            eq(contractKeyTerms.orgId, ctx.user.orgId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Key term not found' })
      }

      const updatePayload: Partial<typeof contractKeyTerms.$inferInsert> = {}

      if (data.value !== undefined) {
        updatePayload.value = data.value
      }
      if (data.isAiFlagged !== undefined) {
        updatePayload.isAiFlagged = data.isAiFlagged
      }
      if ('flagReason' in data) {
        updatePayload.flagReason = data.flagReason ?? null
      }

      const [updated] = await ctx.db
        .update(contractKeyTerms)
        .set(updatePayload)
        .where(eq(contractKeyTerms.id, id))
        .returning()

      return updated
    }),
})
