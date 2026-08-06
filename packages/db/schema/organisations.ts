import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // starter | professional | enterprise
  plan: text('plan').notNull().default('starter'),
  // buyer | vendor | both (vendor side added in Sprint 11)
  orgType: text('org_type').notNull().default('buyer'),
  abn: text('abn'),
  industry: text('industry'),
  // ── Billing (Stripe) ──────────────────────────────────────────────────────
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  // active | trialing | past_due | canceled | null (never subscribed)
  subscriptionStatus: text('subscription_status'),
  // Free tier only: when starter access expires (org creation + 3 months)
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Organisation = typeof organisations.$inferSelect
export type NewOrganisation = typeof organisations.$inferInsert
