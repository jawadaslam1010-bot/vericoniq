-- ============================================================
-- Contractly — Sprint 5: Stripe Billing
-- Run this in Supabase SQL Editor after 0004_invitations_renewal_reminders.sql
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT;
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;

-- Backfill: existing starter orgs get a 3-month clock from their creation date.
UPDATE public.organisations
SET trial_ends_at = created_at + INTERVAL '3 months'
WHERE plan = 'starter' AND trial_ends_at IS NULL;

-- Look up orgs by Stripe customer id in webhooks.
CREATE INDEX IF NOT EXISTS organisations_stripe_customer_idx
  ON public.organisations(stripe_customer_id);
