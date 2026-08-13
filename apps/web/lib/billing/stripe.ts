import Stripe from 'stripe'

// Lazy singleton so builds and tests never need a real key. Any runtime path
// that reaches Stripe without STRIPE_SECRET_KEY set fails with a clear message.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set — billing is not configured for this environment.')
  }
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion })
  }
  return _stripe
}

export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Price IDs come from env so amounts can change without code changes. */
export const STRIPE_PRICES = {
  proMonthly: () => process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  proAnnual: () => process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  essentialsMonthly: () => process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY ?? '',
  essentialsAnnual: () => process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL ?? '',
}

export type PaidTier = 'essentials' | 'professional'

export function priceIdFor(tier: PaidTier, interval: 'monthly' | 'annual'): string {
  if (tier === 'essentials') {
    return interval === 'monthly' ? STRIPE_PRICES.essentialsMonthly() : STRIPE_PRICES.essentialsAnnual()
  }
  return interval === 'monthly' ? STRIPE_PRICES.proMonthly() : STRIPE_PRICES.proAnnual()
}
