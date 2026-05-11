-- ============================================================
-- Contractly — Sprint 2: Contracts, Documents, Key Terms, KPIs
-- Run this in Supabase SQL Editor after 0001_initial_schema.sql
-- ============================================================

-- ─── Contracts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contracts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  vendor_id             UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  contract_number       TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'expired', 'terminated', 'pending')),
  start_date            DATE,
  end_date              DATE,
  notice_period_days    INTEGER,
  notice_deadline       DATE, -- calculated: end_date - notice_period_days
  auto_renewal          BOOLEAN NOT NULL DEFAULT false,
  auto_renewal_months   INTEGER,
  annual_value          NUMERIC(12,2),
  monthly_value         NUMERIC(12,2),
  currency              TEXT NOT NULL DEFAULT 'AUD',
  -- AI extraction status
  extraction_status     TEXT NOT NULL DEFAULT 'pending'
                          CHECK (extraction_status IN ('pending', 'processing', 'complete', 'failed')),
  ai_extraction_notes   TEXT,
  perspective           TEXT NOT NULL DEFAULT 'buyer'
                          CHECK (perspective IN ('buyer', 'vendor')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_org_id_idx       ON public.contracts(org_id);
CREATE INDEX IF NOT EXISTS contracts_vendor_id_idx    ON public.contracts(vendor_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx       ON public.contracts(org_id, status);

-- ─── Contract Documents ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id       UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  -- msa | schedule | annexure | amendment | other
  -- Precedence: amendment > schedule > annexure > msa
  doc_type          TEXT NOT NULL
                      CHECK (doc_type IN ('msa', 'schedule', 'annexure', 'amendment', 'other')),
  -- Lower number = higher precedence (amendments = 0, msa = 4)
  hierarchy_order   INTEGER NOT NULL DEFAULT 4,
  storage_path      TEXT NOT NULL,
  file_size_bytes   INTEGER,
  page_count        INTEGER,
  -- Full extracted text from PDF — used as context for Claude API calls
  extracted_text    TEXT,
  -- For amendments: which document does this supersede?
  supersedes_doc_id UUID REFERENCES public.contract_documents(id),
  supersedes_clause TEXT,
  uploaded_by       UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_docs_contract_id_idx ON public.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS contract_docs_org_id_idx      ON public.contract_documents(org_id);

-- ─── Contract Key Terms ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_key_terms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  -- date | obligation | liability | payment | dispute | termination
  term_type     TEXT NOT NULL
                  CHECK (term_type IN ('date', 'obligation', 'liability', 'payment', 'dispute', 'termination')),
  label         TEXT NOT NULL,   -- e.g. "Notice deadline", "Liability cap"
  value         TEXT NOT NULL,   -- extracted value
  clause_ref    TEXT,            -- e.g. "Clause 14.1"
  source_doc_id UUID REFERENCES public.contract_documents(id),
  is_ai_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason   TEXT,            -- ambiguity, trap, gap, conflict
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS key_terms_contract_id_idx ON public.contract_key_terms(contract_id);
CREATE INDEX IF NOT EXISTS key_terms_org_id_idx      ON public.contract_key_terms(org_id);

-- ─── KPIs ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kpis (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  -- contractual = breach logic applies | operational = watch/met only
  kpi_type            TEXT NOT NULL
                        CHECK (kpi_type IN ('contractual', 'operational')),
  -- uptime | response_time | quality | delivery | compliance | custom
  category            TEXT,
  target_value        NUMERIC(10,4),
  -- gte | lte | eq | between
  target_operator     TEXT NOT NULL
                        CHECK (target_operator IN ('gte', 'lte', 'eq', 'between')),
  target_value_max    NUMERIC(10,4), -- for 'between' operator
  -- % | hours | days | count | $ | custom
  unit                TEXT,
  unit_label          TEXT,          -- display label e.g. "% monthly average"
  -- weekly | monthly | quarterly | annual
  cadence             TEXT NOT NULL
                        CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'annual')),
  due_day_rule        TEXT DEFAULT '5th_business_day',
  -- Credit formula fields
  credit_formula      TEXT,          -- plain text description
  credit_per_unit     NUMERIC(10,2), -- e.g. $500 per hour exceeded
  credit_percent_mrc  NUMERIC(5,2),  -- % of MRC per unit below target
  credit_cap_percent  NUMERIC(5,2),  -- max credit as % of MRC
  credit_cap_amount   NUMERIC(12,2), -- max credit absolute amount AUD
  clause_ref          TEXT,
  source_doc_id       UUID REFERENCES public.contract_documents(id),
  -- ai | manual
  added_by            TEXT NOT NULL
                        CHECK (added_by IN ('ai', 'manual')),
  added_by_user_id    UUID REFERENCES public.users(id),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpis_contract_id_idx ON public.kpis(contract_id);
CREATE INDEX IF NOT EXISTS kpis_org_id_idx      ON public.kpis(org_id);
CREATE INDEX IF NOT EXISTS kpis_type_idx        ON public.kpis(org_id, kpi_type);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.contracts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_key_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.contracts;
CREATE POLICY "org_isolation" ON public.contracts
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation" ON public.contract_documents;
CREATE POLICY "org_isolation" ON public.contract_documents
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation" ON public.contract_key_terms;
CREATE POLICY "org_isolation" ON public.contract_key_terms
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation" ON public.kpis;
CREATE POLICY "org_isolation" ON public.kpis
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ─── Updated_at triggers ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS kpis_updated_at ON public.kpis;
CREATE TRIGGER kpis_updated_at
  BEFORE UPDATE ON public.kpis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Audit triggers ───────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS contracts_audit ON public.contracts;
CREATE TRIGGER contracts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS contract_documents_audit ON public.contract_documents;
CREATE TRIGGER contract_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS kpis_audit ON public.kpis;
CREATE TRIGGER kpis_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.kpis
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
