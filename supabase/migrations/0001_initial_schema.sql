-- ============================================================
-- Contractly — Sprint 1 Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Region: ap-southeast-2 (Sydney) — Privacy Act 1988 requirement
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Organisations (multi-tenant root)
CREATE TABLE IF NOT EXISTS public.organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter'
                CHECK (plan IN ('starter', 'professional', 'enterprise')),
  org_type    TEXT NOT NULL DEFAULT 'buyer'
                CHECK (org_type IN ('buyer', 'vendor', 'both')),
  abn         TEXT,
  industry    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_org_id_idx ON public.users(org_id);

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  abn                TEXT,
  service_type       TEXT NOT NULL
                       CHECK (service_type IN (
                         'telco', 'it', 'cloud', 'facilities', 'security',
                         'construction', 'supply', 'property', 'custom'
                       )),
  contact_name       TEXT,
  contact_email      TEXT,
  submission_email   TEXT,
  submission_method  TEXT NOT NULL DEFAULT 'excel'
                       CHECK (submission_method IN ('excel', 'webform', 'both', 'manual')),
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'inactive', 'terminated')),
  health_score       NUMERIC(5,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ  -- soft delete
);

CREATE INDEX IF NOT EXISTS vendors_org_id_idx        ON public.vendors(org_id);
CREATE INDEX IF NOT EXISTS vendors_org_status_idx    ON public.vendors(org_id, status);
CREATE INDEX IF NOT EXISTS vendors_org_created_idx   ON public.vendors(org_id, created_at DESC);

-- Audit logs (immutable — written by triggers only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.organisations(id),
  user_id        UUID,  -- null for system/trigger actions
  action         TEXT NOT NULL,       -- INSERT | UPDATE | DELETE
  resource_type  TEXT NOT NULL,       -- table name
  resource_id    UUID NOT NULL,
  old_values     JSONB,               -- previous state (null for INSERT)
  new_values     JSONB,               -- new state (null for DELETE)
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_org_id_idx    ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx  ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx   ON public.audit_logs(created_at DESC);


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Every table has RLS enabled before any data can be inserted.
-- org_id is always extracted from the verified JWT, never from request params.

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;

-- Organisations: user can only see their own org
CREATE POLICY "org_isolation" ON public.organisations
  FOR ALL
  USING (id = (auth.jwt() ->> 'org_id')::uuid);

-- Users: members can see users in their own org
CREATE POLICY "org_isolation" ON public.users
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Vendors: strict org isolation
CREATE POLICY "org_isolation" ON public.vendors
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Audit logs: INSERT only for authenticated users; SELECT own org only; no UPDATE/DELETE
CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_view_own" ON public.audit_logs
  FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- No UPDATE or DELETE policies on audit_logs — immutable by design


-- ─── Updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── Audit logging trigger ───────────────────────────────────────────────────
-- Writes immutable audit records on every INSERT/UPDATE/DELETE.
-- Applied to vendors here; will be applied to more tables in Sprint 2+.

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    org_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    TG_OP,                                                    -- INSERT | UPDATE | DELETE
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to vendors
CREATE TRIGGER vendors_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();


-- ─── Custom Access Token Hook (JWT org_id claim) ─────────────────────────────
-- This function adds org_id to JWT claims so RLS can use (auth.jwt() ->> 'org_id').
-- REQUIRED SETUP: After running this migration, go to:
--   Supabase Dashboard → Authentication → Hooks → Custom Access Token
--   Set hook function to: public.custom_access_token_hook
--
-- Without this hook, auth.jwt() ->> 'org_id' returns null and RLS blocks all access.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims    jsonb;
  user_org  uuid;
  user_role text;
BEGIN
  -- Look up org_id and role from the users table
  SELECT org_id, role
    INTO user_org, user_role
    FROM public.users
   WHERE id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF user_org IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}',   to_jsonb(user_org::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant supabase_auth_admin permission to call this function
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;


-- ─── Supabase Storage ────────────────────────────────────────────────────────
-- Run these statements to create the contracts storage bucket.
-- IMPORTANT: The bucket must be in ap-southeast-2.
--
-- You can also create it via: Supabase Dashboard → Storage → New bucket
--   Name: contracts
--   Public: NO (private bucket — all access via signed URLs)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,    -- private — never public
  52428800, -- 50 MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files in their own org's folder
-- Files are stored at: {org_id}/{vendor_id}/{filename}
-- The first path component must match the JWT org_id

CREATE POLICY "org_storage_isolation" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
  )
  WITH CHECK (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'org_id')
  );


-- ─── Verification queries ─────────────────────────────────────────────────────
-- Run these after migration to confirm everything is set up correctly.

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;

-- Check policies exist:
-- SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;

-- Check audit trigger exists on vendors:
-- SELECT trigger_name FROM information_schema.triggers
--   WHERE event_object_table = 'vendors';
