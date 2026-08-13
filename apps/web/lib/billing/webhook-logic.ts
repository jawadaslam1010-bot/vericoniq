/**
 * Pure mapping from a Stripe subscription state to the org's plan fields.
 * Kept free of Stripe SDK types and DB access so it can be unit-tested.
 */

export type SubscriptionSnapshot = {
  status: string // active | trialing | past_due | canceled | unpaid | incomplete | incomplete_expired | paused
  subscriptionId: string
  /** Which paid tier the subscription is for (from subscription metadata). */
  tier?: string | null
}

export type OrgPlanUpdate = {
  plan: 'starter' | 'essentials' | 'professional'
  subscriptionStatus: string
  stripeSubscriptionId: string | null
}

/**
 * Decide the org's plan from a subscription event.
 * - active/trialing/past_due keep paid access (Stripe dunning handles past_due;
 *   we don't cut access mid-retry). The tier comes from subscription metadata,
 *   defaulting to professional for pre-tier subscriptions.
 * - canceled/unpaid/expired drop back to starter. The free-tier expiry clock
 *   still applies from the org's original trial_ends_at.
 */
export function planFromSubscription(sub: SubscriptionSnapshot): OrgPlanUpdate {
  const keepsPaid = ['active', 'trialing', 'past_due'].includes(sub.status)
  if (keepsPaid) {
    return {
      plan: sub.tier === 'essentials' ? 'essentials' : 'professional',
      subscriptionStatus: sub.status,
      stripeSubscriptionId: sub.subscriptionId,
    }
  }
  return {
    plan: 'starter',
    subscriptionStatus: sub.status,
    stripeSubscriptionId: null,
  }
}
