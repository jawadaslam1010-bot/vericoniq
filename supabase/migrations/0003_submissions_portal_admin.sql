-- ============================================================
-- Contractly — Sprint 3: Submissions, Vendor Portal, Platform Admin
-- Run this in Supabase SQL Editor after 0002_sprint2_contracts_kpis.sql
--
-- Idempotent: safe to run against a database that already has these
-- objects (they were applied out-of-band during development). This file
-- makes supabase/migrations the source of truth so a clean deploy
-- reproduces production. It also consolidates the standalone column fixes
-- (result_type, original_storage_path, widened credit precision).
-- ============================================================

-- ─── Column additions to existing tables ─────────────────────────────────────

-- Original (pre-conversion) upload kept alongside the working PDF.
ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS original_storage_path TEXT;

-- KPI result type drives scoring (numeric threshold vs binary met/not-met).
ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS result_type TEXT NOT NULL DEFAULT 'numeric'
    CHECK (result_type IN ('numeric', 'binary'));

-- Widen numeric precision to match the Drizzle schema and avoid overflow on
-- large extracted values.
ALTER TABLE public.kpis ALTER COLUMN target_value       TYPE NUMERIC(20,4);
ALTER TABLE public.kpis ALTER COLUMN target_value_max   TYPE NUMERIC(20,4);
ALTER TABLE public.kpis ALTER COLUMN credit_per_unit    TYPE NUMERIC(20,4);
ALTER TABLE public.kpis ALTER COLUMN credit_percent_mrc TYPE NUMERIC(10,4);
ALTER TABLE public.kpis ALTER COLUMN credit_cap_percent TYPE NUMERIC(10,4);
ALTER TABLE public.kpis ALTER COLUMN credit_cap_amount  TYPE NUMERIC(20,4);

-- ─── Submission Periods ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.submission_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  due_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'submitted', 'reviewing', 'locked')),
  reminder_sent_at TIMESTAMPTZ,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS periods_contract_id_idx ON public.submission_periods(contract_id);
CREATE INDEX IF NOT EXISTS periods_org_id_idx      ON public.submission_periods(org_id);

-- ─── KPI Results ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kpi_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id             UUID NOT NULL REFERENCES public.submission_periods(id) ON DELETE CASCADE,
  kpi_id                UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  contract_id           UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actual_value          NUMERIC(20,4),
  submitted_by_email    TEXT,
  submitted_at          TIMESTAMPTZ,
  comment               TEXT,
  exemption_claimed     BOOLEAN NOT NULL DEFAULT false,
  exemption_reason      TEXT,
  exemption_status      TEXT NOT NULL DEFAULT 'none'
                          CHECK (exemption_status IN ('none', 'pending', 'approved', 'declined')),
  exemption_reviewed_by UUID,
  exemption_reviewed_at TIMESTAMPTZ,
  -- Estimated service credit owed on a breach (computed by lib/kpi-scoring)
  credit_applied        NUMERIC(20,4),
  -- met | risk | breach | exempt | null (not yet entered)
  result_status         TEXT
                          CHECK (result_status IN ('met', 'risk', 'breach', 'exempt')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS results_period_id_idx   ON public.kpi_results(period_id);
CREATE INDEX IF NOT EXISTS results_kpi_id_idx      ON public.kpi_results(kpi_id);
CREATE INDEX IF NOT EXISTS results_contract_id_idx ON public.kpi_results(contract_id);

-- ─── Portal Tokens ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portal_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id    UUID NOT NULL REFERENCES public.submission_periods(id) ON DELETE CASCADE,
  contract_id  UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  vendor_email TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  opened_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_tokens_token_idx     ON public.portal_tokens(token);
CREATE INDEX IF NOT EXISTS portal_tokens_period_id_idx ON public.portal_tokens(period_id);

-- ─── Platform Audit Log ──────────────────────────────────────────────────────
-- Platform-admin actions only. Not tenant-scoped and never exposed to tenants.

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email    TEXT NOT NULL,
  action         TEXT NOT NULL,
  target_org_id  UUID,
  target_user_id UUID,
  metadata       JSONB,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_audit_log_admin_email_idx ON public.platform_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS platform_audit_log_target_org_idx  ON public.platform_audit_log(target_org_id);
CREATE INDEX IF NOT EXISTS platform_audit_log_created_at_idx  ON public.platform_audit_log(created_at);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.submission_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.submission_periods;
CREATE POLICY "org_isolation" ON public.submission_periods
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation" ON public.kpi_results;
CREATE POLICY "org_isolation" ON public.kpi_results
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation" ON public.portal_tokens;
CREATE POLICY "org_isolation" ON public.portal_tokens
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- No tenant policy on platform_audit_log: RLS is enabled with no policy, so
-- tenant JWTs are denied all access. Server-side access uses the privileged
-- connection (service role / owner), which bypasses RLS.

-- ─── Updated_at triggers ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS submission_periods_updated_at ON public.submission_periods;
CREATE TRIGGER submission_periods_updated_at
  BEFORE UPDATE ON public.submission_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS kpi_results_updated_at ON public.kpi_results;
CREATE TRIGGER kpi_results_updated_at
  BEFORE UPDATE ON public.kpi_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
