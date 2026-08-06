import { router, viewerProcedure, adminProcedure } from '../trpc'
import { organisations } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getStripe, billingEnabled, STRIPE_PRICES } from '@/lib/billing/stripe'
import { getOrgBilling, getOrgUsage, planLimits, isFreeTierExpired } from '@/lib/billing/limits'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const billingRouter = router({
  // ── Current plan, usage, and limits for the settings page ──────────────────
  getOverview: viewerProcedure.query(async ({ ctx }) => {
    const [org, usage] = await Promise.all([
      getOrgBilling(ctx.user.orgId),
      getOrgUsage(ctx.user.orgId),
    ])
    const limits = planLimits(org.plan)
    return {
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      freeTierExpired: isFreeTierExpired(org),
      billingEnabled: billingEnabled(),
      usage,
      limits: {
        vendors: limits.vendors === Infinity ? null : limits.vendors,
        contracts: limits.contracts === Infinity ? null : limits.contracts,
        seats: limits.seats === Infinity ? null : limits.seats,
        storageMb: limits.storageMb === Infinity ? null : limits.storageMb,
        maxFileMb: limits.maxFileMb,
      },
    }
  }),

  // ── Start a Pro subscription via Stripe Checkout ───────────────────────────
  createCheckoutSession: adminProcedure
    .input(z.object({ interval: z.enum(['monthly', 'annual']) }))
    .mutation(async ({ ctx, input }) => {
      if (!billingEnabled()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Billing is not configured yet' })
      }
      const priceId = input.interval === 'monthly' ? STRIPE_PRICES.proMonthly() : STRIPE_PRICES.proAnnual()
      if (!priceId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Price is not configured for this interval' })
      }

      const stripe = getStripe()

      // Reuse the org's Stripe customer or create one keyed to the org id.
      const [org] = await ctx.db
        .select()
        .from(organisations)
        .where(eq(organisations.id, ctx.user.orgId))
        .limit(1)
      if (!org) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Organisation not found' })

      let customerId = org.stripeCustomerId
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          name: org.name,
          metadata: { org_id: org.id },
        })
        customerId = customer.id
        await ctx.db
          .update(organisations)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(organisations.id, org.id))
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        subscription_data: { metadata: { org_id: org.id } },
        metadata: { org_id: org.id },
        success_url: `${APP_URL}/settings?billing=success`,
        cancel_url: `${APP_URL}/settings?billing=cancelled`,
      })

      return { url: session.url }
    }),

  // ── Manage an existing subscription via the Customer Portal ────────────────
  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    if (!billingEnabled()) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Billing is not configured yet' })
    }
    const [org] = await ctx.db
      .select({ stripeCustomerId: organisations.stripeCustomerId })
      .from(organisations)
      .where(eq(organisations.id, ctx.user.orgId))
      .limit(1)
    if (!org?.stripeCustomerId) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No billing account yet — upgrade first' })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${APP_URL}/settings`,
    })
    return { url: session.url }
  }),
})
