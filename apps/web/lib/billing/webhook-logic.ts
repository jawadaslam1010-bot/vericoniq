/**
 * Pure mapping from a Stripe subscription state to the org's plan fields.
 * Kept free of Stripe SDK types and DB access so it can be unit-tested.
 */

export type SubscriptionSnapshot = {
  status: string // active | trialing | past_due | canceled | unpaid | incomplete | incomplete_expired | paused
  subscriptionId: string
}

export type OrgPlanUpdate = {
  plan: 'starter' | 'professional'
  subscriptionStatus: string
  stripeSubscriptionId: string | null
}

/**
 * Decide the org's plan from a subscription event.
 * - active/trialing/past_due keep Pro access (Stripe dunning handles past_due;
 *   we don't cut access mid-retry).
 * - canceled/unpaid/expired drop back to starter. The free-tier expiry clock
 *   still applies from the org's original trial_ends_at.
 */
export function planFromSubscription(sub: SubscriptionSnapshot): OrgPlanUpdate {
  const keepsPro = ['active', 'trialing', 'past_due'].includes(sub.status)
  if (keepsPro) {
    return {
      plan: 'professional',
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
