import { router, viewerProcedure, managerProcedure } from '../trpc'
import { kpis, contracts } from '@contractly/db/schema'
import { eq, and } from '@contractly/db'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

// ─── Router ───────────────────────────────────────────────────────────────────

export const kpisRouter = router({
  // List all KPIs for a contract — verifies orgId ownership
  list: viewerProcedure
    .input(z.object({ contractId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select()
        .from(kpis)
        .where(
          and(
            eq(kpis.contractId, input.contractId),
            eq(kpis.orgId, ctx.user.orgId)
          )
        )
        .orderBy(kpis.createdAt)

      return results
    }),

  // Bulk upsert KPIs — called after AI extraction; replaces all AI-extracted KPIs
  bulkUpsert: managerProcedure
    .input(
      z.object({
        contractId: z.string().uuid(),
        kpis: z.array(
          z.object({
            name: z.string(),
            description: z.string().nullable().optional(),
            kpiType: z.enum(['contractual', 'operational']),
            category: z.string(),
            targetValue: z.string().nullable().optional(),
            targetOperator: z.string(),
            targetValueMax: z.string().nullable().optional(),
            unit: z.string().nullable().optional(),
            unitLabel: z.string().nullable().optional(),
            cadence: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
            creditFormula: z.string().nullable().optional(),
            creditPerUnit: z.string().nullable().optional(),
            creditPercentMrc: z.string().nullable().optional(),
            creditCapPercent: z.string().nullable().optional(),
            creditCapAmount: z.string().nullable().optional(),
            clauseRef: z.string().nullable().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the contract belongs to this org
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

      // Delete existing AI-extracted KPIs for this contract
      await ctx.db
        .delete(kpis)
        .where(
          and(
            eq(kpis.contractId, input.contractId),
            eq(kpis.orgId, ctx.user.orgId),
            eq(kpis.addedBy, 'ai')
          )
        )

      // Insert all new KPIs
      if (input.kpis.length === 0) {
        return { count: 0 }
      }

      const inserted = await ctx.db
        .insert(kpis)
        .values(
          input.kpis.map((kpi) => ({
            contractId: input.contractId,
            orgId: ctx.user.orgId,
            addedBy: 'ai' as const,
            addedByUserId: ctx.user.id,
            isActive: false,
            name: kpi.name,
            description: kpi.description ?? null,
            kpiType: kpi.kpiType,
            category: kpi.category,
            targetValue: kpi.targetValue ?? null,
            targetOperator: kpi.targetOperator,
            targetValueMax: kpi.targetValueMax ?? null,
            unit: kpi.unit ?? null,
            unitLabel: kpi.unitLabel ?? null,
            cadence: kpi.cadence,
            creditFormula: kpi.creditFormula ?? null,
            creditPerUnit: kpi.creditPerUnit ?? null,
            creditPercentMrc: kpi.creditPercentMrc ?? null,
            creditCapPercent: kpi.creditCapPercent ?? null,
            creditCapAmount: kpi.creditCapAmount ?? null,
            clauseRef: kpi.clauseRef ?? null,
          }))
        )
        .returning({ id: kpis.id })

      return { count: inserted.length }
    }),

  // Update a KPI — verifies orgId ownership
  update: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        targetValue: z.string().nullable().optional(),
        targetOperator: z.string().optional(),
        targetValueMax: z.string().nullable().optional(),
        unitLabel: z.string().nullable().optional(),
        cadence: z.enum(['weekly', 'monthly', 'quarterly', 'annual']).optional(),
        creditFormula: z.string().nullable().optional(),
        creditPerUnit: z.string().nullable().optional(),
        creditPercentMrc: z.string().nullable().optional(),
        creditCapPercent: z.string().nullable().optional(),
        creditCapAmount: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify ownership
      const [existing] = await ctx.db
        .select({ id: kpis.id })
        .from(kpis)
        .where(and(eq(kpis.id, id), eq(kpis.orgId, ctx.user.orgId)))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'KPI not found' })
      }

      const [updated] = await ctx.db
        .update(kpis)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(kpis.id, id), eq(kpis.orgId, ctx.user.orgId)))
        .returning()

      return updated
    }),

  // Delete a KPI — verifies orgId ownership
  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: kpis.id })
        .from(kpis)
        .where(and(eq(kpis.id, input.id), eq(kpis.orgId, ctx.user.orgId)))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'KPI not found' })
      }

      await ctx.db
        .delete(kpis)
        .where(and(eq(kpis.id, input.id), eq(kpis.orgId, ctx.user.orgId)))

      return { success: true }
    }),

  // Activate all KPIs for a contract — called when user confirms extracted KPIs
  activate: managerProcedure
    .input(z.object({ contractId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(kpis)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(kpis.contractId, input.contractId),
            eq(kpis.orgId, ctx.user.orgId)
          )
        )
        .returning({ id: kpis.id })

      return { count: result.length }
    }),
})
