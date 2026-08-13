import { router, viewerProcedure, managerProcedure } from '../trpc'
import { submissionPeriods, kpiResults, kpis, contracts, vendors, portalTokens } from '@contractly/db/schema'
import { eq, and, asc, sql } from '@contractly/db'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'
import { sendPortalLink, sendLockNotification } from '@/lib/email'
import { scoreKpiResult, computeKpiCredit, contractMrc } from '@/lib/kpi-scoring'
import { planHasFeature } from '@contractly/types'
import { getOrgBilling } from '@/lib/billing/limits'

export const submissionsRouter = router({

  // ── List all periods for a contract ────────────────────────────────────────
  listPeriods: viewerProcedure
    .input(z.object({ contractId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify contract belongs to org
      const [contract] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })

      return ctx.db
        .select()
        .from(submissionPeriods)
        .where(and(
          eq(submissionPeriods.contractId, input.contractId),
          eq(submissionPeriods.orgId, ctx.user.orgId)
        ))
        .orderBy(asc(submissionPeriods.periodStart))
    }),

  // ── Get a single period with all its KPI results ───────────────────────────
  getPeriod: viewerProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [period] = await ctx.db
        .select()
        .from(submissionPeriods)
        .where(and(
          eq(submissionPeriods.id, input.periodId),
          eq(submissionPeriods.orgId, ctx.user.orgId)
        ))
        .limit(1)
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Period not found' })

      const results = await ctx.db
        .select({
          result: kpiResults,
          kpi: kpis,
        })
        .from(kpiResults)
        .innerJoin(kpis, eq(kpiResults.kpiId, kpis.id))
        .where(eq(kpiResults.periodId, input.periodId))
        .orderBy(asc(kpis.name))

      return { period, results }
    }),

  // ── Create a new period — seeds blank kpi_results only for KPIs due this period ─
  createPeriod: managerProcedure
    .input(z.object({
      contractId: z.string().uuid(),
      periodStart: z.string(), // YYYY-MM-DD
      periodEnd: z.string(),
      dueDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, ctx.user.orgId)))
        .limit(1)
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' })

      // Determine which cadences are due based on period end month
      // Month is 1-indexed: Mar=3, Jun=6, Sep=9, Dec=12
      const endMonth = new Date(input.periodEnd).getMonth() + 1
      const isQuarterEnd = [3, 6, 9, 12].includes(endMonth)
      // Annual: June (AU financial year end) or December (calendar year end)
      const isYearEnd = [6, 12].includes(endMonth)

      // Create the period
      const [period] = await ctx.db
        .insert(submissionPeriods)
        .values({
          contractId: input.contractId,
          orgId: ctx.user.orgId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          dueDate: input.dueDate,
          status: 'open',
          createdBy: ctx.user.id,
        })
        .returning()

      // Fetch all active KPIs for this contract
      const activeKpis = await ctx.db
        .select({ id: kpis.id, cadence: kpis.cadence })
        .from(kpis)
        .where(and(
          eq(kpis.contractId, input.contractId),
          eq(kpis.orgId, ctx.user.orgId),
          eq(kpis.isActive, true)
        ))

      // Filter to only KPIs due in this period based on cadence
      const dueKpis = activeKpis.filter(kpi => {
        const cadence = kpi.cadence ?? 'monthly'
        if (cadence === 'weekly' || cadence === 'monthly') return true
        if (cadence === 'quarterly') return isQuarterEnd
        if (cadence === 'annual') return isYearEnd
        return true
      })

      // Seed blank results only for due KPIs
      if (dueKpis.length > 0) {
        await ctx.db.insert(kpiResults).values(
          dueKpis.map(kpi => ({
            periodId: period.id,
            kpiId: kpi.id,
            contractId: input.contractId,
            orgId: ctx.user.orgId,
          }))
        )
      }

      return period
    }),

  // ── Save a single KPI result ───────────────────────────────────────────────
  saveResult: managerProcedure
    .input(z.object({
      resultId: z.string().uuid(),
      actualValue: z.string().nullable(),
      comment: z.string().nullable(),
      exemptionClaimed: z.boolean(),
      exemptionReason: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(kpiResults)
        .where(and(
          eq(kpiResults.id, input.resultId),
          eq(kpiResults.orgId, ctx.user.orgId)
        ))
        .limit(1)
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Result not found' })

      // Fetch KPI (result type, target, credit terms) and its contract's MRC
      const kpi = await ctx.db
        .select()
        .from(kpis)
        .where(eq(kpis.id, existing.kpiId))
        .limit(1)
        .then(r => r[0])

      const contract = await ctx.db
        .select({ monthlyValue: contracts.monthlyValue, annualValue: contracts.annualValue })
        .from(contracts)
        .where(eq(contracts.id, existing.contractId))
        .limit(1)
        .then(r => r[0])

      // Calculate result status — exemption claimed does NOT set status to exempt;
      // that only happens when an operator approves the exemption via reviewExemption.
      const scored = kpi ? scoreKpiResult(kpi, input.actualValue) : null
      const resultStatus: string | null = scored ?? existing.resultStatus

      // Estimate the service credit owed on a breach.
      const creditApplied = kpi
        ? computeKpiCredit({ kpi, resultStatus, actualValue: input.actualValue, mrc: contractMrc(contract) })
        : 0

      await ctx.db
        .update(kpiResults)
        .set({
          actualValue: input.actualValue,
          comment: input.comment,
          exemptionClaimed: input.exemptionClaimed,
          exemptionReason: input.exemptionReason,
          exemptionStatus: input.exemptionClaimed ? 'pending' : 'none',
          resultStatus,
          creditApplied: String(creditApplied),
          submittedByEmail: ctx.user.email,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(kpiResults.id, input.resultId))

      return { success: true, resultStatus, creditApplied }
    }),

  // ── Update period status ───────────────────────────────────────────────────
  updatePeriodStatus: managerProcedure
    .input(z.object({
      periodId: z.string().uuid(),
      status: z.enum(['open', 'submitted', 'reviewing', 'locked']),
    }))
    .mutation(async ({ ctx, input }) => {
      const [period] = await ctx.db
        .select()
        .from(submissionPeriods)
        .where(and(
          eq(submissionPeriods.id, input.periodId),
          eq(submissionPeriods.orgId, ctx.user.orgId)
        ))
        .limit(1)
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Period not found' })

      await ctx.db
        .update(submissionPeriods)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(submissionPeriods.id, input.periodId))

      // When locking, notify vendor email if a portal token exists — best-effort
      if (input.status === 'locked') {
        try {
          const [token] = await ctx.db
            .select({ vendorEmail: portalTokens.vendorEmail })
            .from(portalTokens)
            .where(and(eq(portalTokens.periodId, input.periodId), eq(portalTokens.orgId, ctx.user.orgId)))
            .limit(1)

          if (token?.vendorEmail) {
            const [contract] = await ctx.db
              .select({ name: contracts.name, vendorId: contracts.vendorId })
              .from(contracts)
              .where(eq(contracts.id, period.contractId))
              .limit(1)

            const [vendor] = contract
              ? await ctx.db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, contract.vendorId)).limit(1)
              : [null]

            const [counts] = await ctx.db
              .select({
                total: sql<number>`count(*)`,
                met: sql<number>`count(case when ${kpiResults.resultStatus} in ('met', 'risk') then 1 end)`,
                breaches: sql<number>`count(case when ${kpiResults.resultStatus} = 'breach' then 1 end)`,
                exemptApproved: sql<number>`count(case when ${kpiResults.resultStatus} = 'exempt' then 1 end)`,
              })
              .from(kpiResults)
              .where(and(eq(kpiResults.periodId, input.periodId), eq(kpiResults.orgId, ctx.user.orgId)))

            const fmtDate = (d: string | null) => {
              if (!d) return '—'
              return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
            }

            await sendLockNotification({
              to: token.vendorEmail,
              vendorName: vendor?.name ?? 'Vendor',
              contractName: contract?.name ?? 'contract',
              periodLabel: `${fmtDate(period.periodStart)} – ${fmtDate(period.periodEnd)}`,
              breaches: Number(counts?.breaches ?? 0),
              exemptionsApproved: Number(counts?.exemptApproved ?? 0),
              total: Number(counts?.total ?? 0),
              met: Number(counts?.met ?? 0),
            })
          }
        } catch (err) {
          // Non-fatal
          console.error('[submissions/updatePeriodStatus] lock notification error:', err)
        }
      }

      return { success: true }
    }),

  // ── Review exemption claim ─────────────────────────────────────────────────
  reviewExemption: managerProcedure
    .input(z.object({
      resultId: z.string().uuid(),
      decision: z.enum(['approved', 'declined']),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(kpiResults)
        .where(and(
          eq(kpiResults.id, input.resultId),
          eq(kpiResults.orgId, ctx.user.orgId)
        ))
        .limit(1)
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Result not found' })

      await ctx.db
        .update(kpiResults)
        .set({
          exemptionStatus: input.decision,
          exemptionReviewedBy: ctx.user.id,
          exemptionReviewedAt: new Date(),
          resultStatus: input.decision === 'approved' ? 'exempt' : existing.resultStatus,
          // Approving an exemption waives any credit that had accrued on the breach.
          creditApplied: input.decision === 'approved' ? '0' : existing.creditApplied,
          updatedAt: new Date(),
        })
        .where(eq(kpiResults.id, input.resultId))

      return { success: true }
    }),

  // ── Generate portal token for a period ────────────────────────────────────
  generateToken: managerProcedure
    .input(z.object({
      periodId: z.string().uuid(),
      vendorEmail: z.string().email().optional(),
      sendEmail: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // The vendor portal is a Professional feature.
      const org = await getOrgBilling(ctx.user.orgId)
      if (!planHasFeature(org.plan, 'vendorPortal')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'The vendor submission portal is available on the Professional plan. Upgrade in Settings to send portal links.',
        })
      }

      const [period] = await ctx.db
        .select()
        .from(submissionPeriods)
        .where(and(
          eq(submissionPeriods.id, input.periodId),
          eq(submissionPeriods.orgId, ctx.user.orgId),
        ))
        .limit(1)
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Period not found' })

      // Expire 30 days after the due date to allow late submissions
      const expiresAt = new Date(period.dueDate)
      expiresAt.setDate(expiresAt.getDate() + 30)

      const token = `viq_${randomBytes(32).toString('hex')}`

      const [created] = await ctx.db
        .insert(portalTokens)
        .values({
          periodId: input.periodId,
          contractId: period.contractId,
          orgId: ctx.user.orgId,
          token,
          vendorEmail: input.vendorEmail ?? null,
          expiresAt,
        })
        .returning()

      // Optionally send email
      if (input.sendEmail && input.vendorEmail) {
        const [contract] = await ctx.db
          .select({ name: contracts.name, vendorId: contracts.vendorId })
          .from(contracts)
          .where(eq(contracts.id, period.contractId))
          .limit(1)

        const [vendor] = contract
          ? await ctx.db
              .select({ name: vendors.name })
              .from(vendors)
              .where(eq(vendors.id, contract.vendorId))
              .limit(1)
          : [null]

        const fmtDate = (d: string | null) => {
          if (!d) return '—'
          return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        }

        await sendPortalLink({
          to: input.vendorEmail,
          vendorName: vendor?.name ?? 'Team',
          contractName: contract?.name ?? 'contract',
          periodLabel: `${fmtDate(period.periodStart)} – ${fmtDate(period.periodEnd)}`,
          dueDate: fmtDate(period.dueDate),
          token: created.token,
        })
      }

      return { token: created.token, expiresAt: created.expiresAt }
    }),

  // ── List tokens for a period ───────────────────────────────────────────────
  listTokens: managerProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(portalTokens)
        .where(and(
          eq(portalTokens.periodId, input.periodId),
          eq(portalTokens.orgId, ctx.user.orgId),
        ))
        .orderBy(asc(portalTokens.createdAt))
    }),
})
