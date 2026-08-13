-- ============================================================
-- Contractly — Sprint 6: Essentials plan tier
-- Run after 0005_billing.sql. Idempotent — safe to re-run.
-- ============================================================

-- Extend the plan CHECK to include the new paid 'essentials' tier.
ALTER TABLE public.organisations
  DROP CONSTRAINT IF EXISTS organisations_plan_check;
ALTER TABLE public.organisations
  ADD CONSTRAINT organisations_plan_check
  CHECK (plan IN ('starter', 'essentials', 'professional', 'enterprise'));
