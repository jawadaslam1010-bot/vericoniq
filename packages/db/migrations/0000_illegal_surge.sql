CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'starter' NOT NULL,
	"org_type" text DEFAULT 'buyer' NOT NULL,
	"abn" text,
	"industry" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"abn" text,
	"service_type" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"submission_email" text,
	"submission_method" text DEFAULT 'excel' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"health_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"doc_type" text NOT NULL,
	"hierarchy_order" integer DEFAULT 4 NOT NULL,
	"storage_path" text NOT NULL,
	"file_size_bytes" integer,
	"page_count" integer,
	"extracted_text" text,
	"supersedes_doc_id" uuid,
	"supersedes_clause" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_key_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"term_type" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"clause_ref" text,
	"source_doc_id" uuid,
	"is_ai_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contract_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notice_period_days" integer,
	"notice_deadline" date,
	"auto_renewal" boolean DEFAULT false NOT NULL,
	"auto_renewal_months" integer,
	"annual_value" numeric(12, 2),
	"monthly_value" numeric(12, 2),
	"currency" text DEFAULT 'AUD' NOT NULL,
	"extraction_status" text DEFAULT 'pending' NOT NULL,
	"ai_extraction_notes" text,
	"perspective" text DEFAULT 'buyer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kpi_type" text NOT NULL,
	"category" text,
	"target_value" numeric(20, 4),
	"target_operator" text NOT NULL,
	"target_value_max" numeric(20, 4),
	"unit" text,
	"unit_label" text,
	"cadence" text NOT NULL,
	"due_day_rule" text DEFAULT '5th_business_day',
	"credit_formula" text,
	"credit_per_unit" numeric(20, 4),
	"credit_percent_mrc" numeric(10, 4),
	"credit_cap_percent" numeric(10, 4),
	"credit_cap_amount" numeric(20, 4),
	"clause_ref" text,
	"source_doc_id" uuid,
	"added_by" text NOT NULL,
	"added_by_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendors" ADD CONSTRAINT "vendors_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_key_terms" ADD CONSTRAINT "contract_key_terms_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_key_terms" ADD CONSTRAINT "contract_key_terms_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpis" ADD CONSTRAINT "kpis_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpis" ADD CONSTRAINT "kpis_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendors_org_id_idx" ON "vendors" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendors_org_status_idx" ON "vendors" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendors_org_created_idx" ON "vendors" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contract_docs_contract_id_idx" ON "contract_documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contract_docs_org_id_idx" ON "contract_documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "key_terms_contract_id_idx" ON "contract_key_terms" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contracts_org_id_idx" ON "contracts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contracts_vendor_id_idx" ON "contracts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kpis_contract_id_idx" ON "kpis" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kpis_org_id_idx" ON "kpis" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_org_id_idx" ON "audit_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");