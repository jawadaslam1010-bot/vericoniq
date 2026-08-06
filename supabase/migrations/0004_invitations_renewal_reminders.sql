-- ============================================================
-- Contractly — Sprint 4: Team Invitations + Renewal Reminders
-- Run this in Supabase SQL Editor after 0003_submissions_portal_admin.sql
-- Idempotent — safe to re-run.
-- ============================================================

-- ─── Renewal reminder tracking on contracts ──────────────────────────────────
-- Records the last reminder stage emailed (90 | 60 | 30 | 0 days) so the cron
-- job does not send the same reminder twice.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS renewal_reminder_stage   INTEGER;
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;

-- ─── Invitations ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'manager', 'viewer')),
  token       TEXT NOT NULL UNIQUE,
  invited_by  UUID,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_org_id_idx ON public.invitations(org_id);
CREATE INDEX IF NOT EXISTS invitations_token_idx  ON public.invitations(token);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.invitations;
CREATE POLICY "org_isolation" ON public.invitations
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
