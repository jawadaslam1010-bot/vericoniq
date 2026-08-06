export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@contractly/db'
import { organisations } from '@contractly/db/schema'
import { eq } from '@contractly/db'
import { getStripe } from '@/lib/billing/stripe'
import { planFromSubscription } from '@/lib/billing/webhook-logic'

async function orgIdForEvent(sub: Stripe.Subscription): Promise<string | null> {
  // Prefer explicit metadata (set at checkout), fall back to customer lookup.
  const metaOrg = sub.metadata?.org_id
  if (metaOrg) return metaOrg
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId) return null
  const [org] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.stripeCustomerId, customerId))
    .limit(1)
  return org?.id ?? null
}

async function applySubscription(sub: Stripe.Subscription) {
  const orgId = await orgIdForEvent(sub)
  if (!orgId) {
    console.error('[stripe/webhook] could not resolve org for subscription', sub.id)
    return
  }
  const update = planFromSubscription({ status: sub.status, subscriptionId: sub.id })
  await db
    .update(organisations)
    .set({
      plan: update.plan,
      subscriptionStatus: update.subscriptionStatus,
      stripeSubscriptionId: update.stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(organisations.id, orgId))
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const payload = await req.text()
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          const sub = await getStripe().subscriptions.retrieve(subId)
          await applySubscription(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object as Stripe.Subscription)
        break
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error for', event.type, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
