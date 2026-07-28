# VericonIQ — Project Context for Claude

> **Instruction for Claude**: Update this file at the end of every session that changes code, architecture, or decisions. Do not wait to be asked.

---

## What this project is
VericonIQ is an AI-powered contract performance intelligence SaaS. It reads commercial contracts, extracts KPIs and obligations using Claude AI, then tracks vendor performance against those targets period by period.

- **GitHub**: `jawadaslam1010-bot/vericoniq` (private)
- **Vercel**: auto-deploys from `main` — project name `vericoniq-web`
- **Domain**: vericoniq.com (VentraIP, A record → 216.150.1.1)
- **Supabase**: project named "VericonIQ" — ap-southeast-2 region
- **Founder**: Jawad Aslam — jawad@mypropiq.com.au

---

## Stack
- **Monorepo**: Turborepo + pnpm (`apps/web`, `packages/db`, `packages/ai`)
- **Framework**: Next.js 14 App Router
- **Database**: Drizzle ORM → Supabase Postgres
- **Auth**: Supabase Auth (magic link enabled)
- **AI**: Anthropic Claude API — `packages/ai`
- **Fonts**: DM Sans (body) + DM Serif Display (headings) + JetBrains Mono (mono)
- **UI**: Tailwind CSS + shadcn/ui + custom design token system

---

## Critical patterns — always follow these
1. Every route/layout that uses DB or env vars needs `export const dynamic = 'force-dynamic'` at the top
2. Supabase client must be created **inside** component/handler functions — never at module level
3. All env vars must be listed in `turbo.json` → `build.env` array for Vercel to pass them through
4. `useSearchParams()` requires `<Suspense>` wrapper in production builds
5. AI extraction: dynamic batching by character count (MAX_CHARS_PER_BATCH = 150k), large docs chunked at 150k chars with 1k overlap, sequential calls, deduplicates key_terms by label. max_tokens: 32000 per batch.
6. KPI `target_operator` must default to `'gte'` if AI returns null
7. KPI `added_by` CHECK constraint: only `'ai'` or `'manual'` — nothing else
8. DB client in `packages/db/client.ts` uses lazy Proxy init — never initialises at module load time
9. `export const dynamic = 'force-dynamic'` must be the **first line** of every dashboard page and API route
10. Schema changes: `drizzle-kit push` has FK introspection bug in v0.22.8 — run `ALTER TABLE` SQL directly in Supabase SQL Editor instead

---

## Environment / Deployment

### Local dev
- `pnpm dev` from monorepo root → starts `apps/web` on `http://localhost:3000`
- `localhost:3000` bypasses the landing page entirely — redirects straight to `/login` or `/dashboard`
- This is controlled by `NODE_ENV === 'development'` check in `middleware.ts`

### Production (Vercel)
- Root Directory: `apps/web`
- Build Command: `next build` (overridden — bypasses Turbo remote cache)
- "Include files outside root directory": **Enabled** (required for monorepo packages)
- `vericoniq.com` shows **landing page only** — no sign-in link visible to the public
- Authenticated users who know the URL can still access `/dashboard`

### Vercel env vars required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL          (Supabase transaction pooler, port 6543)
ANTHROPIC_API_KEY
ANTHROPIC_MODEL       (e.g. claude-sonnet-4-6)
```

---

## Design system

### Colour tokens (globals.css → tailwind.config.ts)
- Background: `--page: #faf8f3`, `--surface: #ffffff`
- Primary: `--primary: #0d9488`, `--primary-hover: #0b837a`
- Text: `--ink`, `--ink-soft`, `--muted`, `--faint`
- Borders: `--border`, `--border-soft`
- Hover: `--hover: #f5f1e8`, `--header-cell: #f7f4ec`
- Status palette: `status-met / risk / breach / stale / info` each with `bg / text / border / dot` variants

### Tailwind custom utilities
- `tracking-eyebrow: 0.11em` — used for ALL-CAPS section labels
- `transition-colors duration-180` — standard hover transition
- `font-serif` → DM Serif Display
- `font-mono` → JetBrains Mono

### Key shared components
- `<StatusBadge status="met|risk|breach|stale|info" label="..." />` — `components/ui/status-badge.tsx`
- `<VendorMark name={} id={} size={} radius={} />` — avatar with deterministic colour
- `<VendorTabBar vendorId={} tabs={} />` — client component, active tab via `usePathname()`
- `<PageTitle>` — serif heading

---

## App routes

### Public
- `/` — landing page (public). In dev, bypassed → redirects to `/login` or `/dashboard`
- `/login` — Supabase magic link auth
- `/signup` — account creation
- `/api/waitlist` — waitlist form POST → `waitlist` table

### Authenticated app
- `/dashboard` — main overview: Action Queue, Portfolio Health, Recent Activity, Vendors table
- `/vendors` — vendor list
- `/vendors/new` — create vendor form
- `/vendors/[vendorId]` — vendor overview (tab: Overview)
- `/vendors/[vendorId]/contracts` — contracts list for vendor
- `/vendors/[vendorId]/contracts/new` — create contract form
- `/vendors/[vendorId]/contracts/[contractId]` — contract detail + documents + AI extraction
- `/vendors/[vendorId]/contracts/[contractId]/kpis` — KPI register (review/edit/activate KPIs + key terms)
- `/vendors/[vendorId]/contracts/[contractId]/submissions` — list all periods for a contract
- `/vendors/[vendorId]/contracts/[contractId]/submissions/[periodId]` — results entry for a period
- `/vendors/[vendorId]/submissions` — all periods across all vendor contracts
- `/vendors/[vendorId]/kpis` — vendor-level KPI tab (stub)
- `/vendors/[vendorId]/scorecard` — coming soon stub
- `/vendors/[vendorId]/breaches` — coming soon stub
- `/vendors/[vendorId]/documents` — redirects to contracts tab
- `/vendors/[vendorId]/activity` — coming soon stub (future: change history)

### API routes
- `POST /api/contracts/[contractId]/extract` — full AI extraction (KPIs + key terms + contract details). `maxDuration = 300`.
- `POST /api/contracts/[contractId]/extract-details` — **lightweight extraction** (contract metadata only, no KPIs). `maxDuration = 60`. Does NOT touch KPIs.
- `POST /api/extract-pdf` — downloads PDF from Supabase storage, runs `pdf-parse`, returns text + page count
- `POST /api/convert-to-pdf` — converts DOCX → PDF (mammoth/pdfkit)

---

## AI extraction pipeline

### Full extraction (`/api/contracts/[contractId]/extract`)
**Flow**: fetch docs with `extractedText` → dynamic batching by char count (MAX_CHARS_PER_BATCH = 150k) → call Claude per batch → merge results → delete old AI KPIs → insert new KPIs (`isActive: false`) → insert key terms → save `contract_details` to contract record → set `extractionStatus: 'complete'`

**Output shape** (`ExtractionResult` in `packages/ai/extraction.ts`):
```typescript
{
  kpis: ExtractedKPI[]
  key_terms: ExtractedKeyTerm[]
  conflicts: ExtractionConflict[]
  ai_notes: string
  contract_details: ExtractedContractDetails | null
}
```

**`ExtractedKPI`** includes `result_type: 'numeric' | 'binary'` — AI sets this automatically:
- `numeric` — KPI measured by a number (%, hours, count, $)
- `binary` — KPI is simply met or not met (e.g. "must provide monthly report")

**`ExtractedContractDetails`**:
```typescript
{
  contract_number, start_date, end_date,
  notice_period_days, notice_deadline,
  auto_renewal, auto_renewal_months,
  annual_value, monthly_value, total_contract_value, currency
}
```

**After full extraction**, the contract record is updated with all `contract_details` fields found. This means dates, notice period, auto-renewal, and financial values are all auto-populated.

### Lightweight details extraction (`/api/contracts/[contractId]/extract-details`)
- Separate route, separate prompt (`packages/ai/prompts/details-extraction.ts`)
- Only asks Claude for `contract_details` — no KPI extraction at all
- Takes ~10 seconds vs 1–3 minutes for full extraction
- Safe to run on contracts that already have confirmed KPIs
- Triggered by "Extract" (sparkle icon) button in the `ContractDetailsPanel`

### Extraction statuses
`pending` → `processing` → `complete` | `failed`

### KPI workflow
1. AI extraction inserts KPIs with `isActive: false`, sets `result_type` automatically
2. User reviews on `/contracts/[id]/kpis` — can edit name, target, cadence, credit formula, result_type
3. User clicks "Confirm & Activate" → all KPIs flip to `isActive: true`
4. Active KPIs feed into submission periods

---

## Contract detail page (`/vendors/[vendorId]/contracts/[contractId]`)

### Layout
Two-column: `lg:grid-cols-[1fr_280px]`

**Left column:**
- Contract documents card (DocumentList + DocumentUploadPanel)
- AI extraction card (ExtractionTrigger — polls every 5s when processing)
- AI notes card (shown post-extraction)

**Right column:**
- Contract name + status badge header
- `<ContractDetailsPanel>` — unified read/edit panel (see below)
- KPI Register link card (shown post-extraction)
- Submissions link card (shown post-extraction)

### ContractDetailsPanel (`components/contracts/ContractDetailsPanel.tsx`)
- Client component — handles all edit state locally
- **Read mode**: shows all fields grouped into Dates / Renewal / Financial / Other
  - Two header buttons: **Extract** (sparkle — calls `/extract-details`, ~10s, leaves KPIs untouched) and **Edit** (pencil)
  - After AI extraction: teal "AI populated — review and edit if needed" banner
  - Notice deadline shows "(calc.)" label when derived from end date − notice period, not explicitly extracted
- **Edit mode**: full inline form — date pickers, number inputs, checkbox for auto-renewal, currency select, perspective select
- Single Save calls `api.contracts.updateDetails` tRPC mutation

---

## Document viewing
- Documents panel shows an external link icon on hover for each document
- Clicking generates a Supabase signed URL (1 hour) and opens in new tab
- For DOCX files: `originalStoragePath` is used if set (stored at `{orgId}/{contractId}/originals/{filename}`) so users see proper formatting
- For PDFs: falls back to `storagePath`

---

## KPI register (`components/contracts/KpiReviewClient.tsx`)

### result_type (numeric vs binary)
- Operator can edit any KPI and change "Result measurement" between:
  - **Numeric value** — measured against target (shows operator, target value, unit label fields)
  - **Met / Not met** — binary pass/fail (hides numeric fields, clears them on save)
- Table shows a purple `binary` badge in the Target column for binary KPIs
- `formatTarget()` returns "Met / Not met" for binary KPIs

### Tabs
- **KPIs** — table with inline edit form (pencil icon per row)
- **Key Terms** — grouped by term type (date, obligation, liability, payment, dispute, termination)
- **Flagged** — AI-flagged items with alert triangle + reason

---

## Submissions system

### Tables (created via SQL in Supabase — drizzle push not used due to FK bug)
```sql
submission_periods:
  id uuid PK, contract_id, org_id
  period_start date, period_end date, due_date date
  status: 'open' | 'submitted' | 'reviewing' | 'locked'
  reminder_sent_at, created_by, created_at, updated_at

kpi_results:
  id uuid PK, period_id, kpi_id, contract_id, org_id
  actual_value text (nullable)
  submitted_by_email, submitted_at
  comment text
  exemption_claimed bool, exemption_reason text
  exemption_status: 'none' | 'pending' | 'approved' | 'declined'
  exemption_reviewed_by, exemption_reviewed_at
  result_status: 'met' | 'risk' | 'breach' | 'exempt' (nullable)
  credit_applied text (nullable)
  created_at, updated_at
```

### tRPC router (`server/routers/submissions.ts`)
- `listPeriods` — all periods for a contract
- `getPeriod` — single period + all KPI results joined with KPI data
- `createPeriod` — creates period, seeds blank kpi_results for due KPIs based on cadence:
  - monthly/weekly: always included
  - quarterly: only in Mar, Jun, Sep, Dec (period end month)
  - annual: only in Jun, Dec
- `saveResult` — saves actual value + calculates result_status:
  - binary KPIs: `'1'` = met, `'0'` = breach
  - numeric: ≥/≤/=/between against target; within 5% = 'risk'
  - **exemption_claimed does NOT set result_status to 'exempt'** — that only happens when operator approves via `reviewExemption`
  - sets `exemption_status = 'pending'` when exemption claimed
- `updatePeriodStatus` — open → submitted → reviewing → locked
- `reviewExemption` — operator approves/declines; approved sets `result_status = 'exempt'`

### Exemption flow
1. Vendor checks "Claim exemption" + enters reason + enters actual value showing the miss → status shows **"Exemption pending"**
2. Operator reviews and approves or declines
3. Approved → result_status = 'exempt' (credit not applied)
4. Declined → result_status stays as calculated breach/met

### ResultsEntryClient (`components/submissions/ResultsEntryClient.tsx`)
- Full results entry UI: filter bar, stats strip, per-row save + save-all
- **Binary KPIs**: Met / Not met toggle buttons (whitespace-nowrap)
- **Numeric KPIs**: number input
- Both remain editable even when exemption is claimed (so actual value showing the miss is recorded)
- Save icon always visible per row — dimmed when no changes, active when dirty
- `resultStatus` tracked in local `values` state (updated from mutation response) — no full page refresh needed after per-row save
- Status badge updates immediately after save without needing router.refresh()
- Table container uses `overflow-x-auto` (not `overflow-hidden`)

### Seed script (`scripts/seed-submissions.ts`)
- Run: `packages/db/node_modules/.bin/tsx scripts/seed-submissions.ts`
- Seeds 12 months Jul 2025–Jun 2026 for the first contract found
- 11 months locked with realistic data (~70% met, ~10% risk, ~15% breach, ~5% exempt)
- June 2026 left open for live testing
- Cadence filtering applied: quarterly KPIs in Sep/Dec/Mar/Jun, annual in Dec/Jun
- Clears existing submission data for the contract before seeding

---

## Known gotchas
- In Next.js API route handlers, never name both the second parameter AND a local variable `context` — TypeScript rejects the duplicate. Rename the local var (e.g. `docContent`).
- `useBreadcrumbs()` in `top-bar.tsx` strips UUID segments via regex — always shows clean labels.
- Supabase `DATABASE_URL` must use the **transaction pooler** (port **6543**), not session mode (5432). Session mode hits the 15-connection cap immediately in dev.
- `ContractFinancialsEditor` has a pre-existing TypeScript error referencing a removed `updateFinancials` mutation — ignore, does not affect runtime.
- The `extract-details` route has a pre-existing implicit `any` TypeScript warning on cookie params — ignore.

---

## Vendor detail layout (`/vendors/[vendorId]/layout.tsx`)

Persistent across all vendor tabs:
- Vendor header: `VendorMark` (56px, radius 12) + serif name + meta row (sector · ABN · counts · StatusBadge)
- Action buttons: "Upload contract" + "Run AI extraction" (shown if any contract is pending/processing)
- 4-stat summary strip: Health score · Annual value · Next renewal countdown · Credits claimable
- `<VendorTabBar>` with tabs: Overview · Contracts · KPIs · Scorecard · Submissions · Breaches · Documents · Activity

---

## Database schema (key tables)

### `contracts`
Key fields: `name, contract_number, status, start_date, end_date, notice_period_days, notice_deadline, auto_renewal, auto_renewal_months, annual_value, monthly_value, currency, extraction_status, ai_extraction_notes, perspective`

### `contract_documents`
Key fields: `contract_id, name, doc_type (msa|schedule|annexure|amendment|other), hierarchy_order, storage_path, original_storage_path, extracted_text, page_count`
- `storage_path`: converted PDF used for text extraction
- `original_storage_path`: original uploaded DOCX (nullable) — served to users for viewing so they see proper formatting
Hierarchy: amendment=0 (highest precedence), schedule=1, annexure=2, msa=4, other=5

### `kpis`
Key fields: `contract_id, name, kpi_type (contractual|operational), category, target_value, target_operator, target_value_max, unit_label, cadence, result_type (numeric|binary), credit_formula, credit_per_unit, credit_percent_mrc, credit_cap_percent, credit_cap_amount, clause_ref, added_by (ai|manual), is_active`
- Numeric precision: all value columns use `numeric(20,4)` — handles values up to hundreds of millions
- `result_type` added via: `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS result_type text NOT NULL DEFAULT 'numeric';`
- AI sets result_type automatically on extraction; operator can override in KPI register edit form

### `contract_key_terms`
Key fields: `contract_id, term_type (date|obligation|liability|payment|dispute|termination), label, value, clause_ref, is_ai_flagged, flag_reason`

### `submission_periods`
Key fields: `contract_id, org_id, period_start, period_end, due_date, status, reminder_sent_at, created_by`

### `kpi_results`
Key fields: `period_id, kpi_id, contract_id, org_id, actual_value, result_status, exemption_claimed, exemption_reason, exemption_status, exemption_reviewed_by, exemption_reviewed_at, credit_applied, submitted_by_email, submitted_at`

### `waitlist`
Fields: `id, name, email (UNIQUE), role, message, created_at`

---

## What's built vs what's next

### Completed
- Full AI extraction pipeline (dynamic batching, chunking, 154 KPIs extracted from 18-doc contract)
- KPI register: review, edit (incl. result_type), activate
- Key terms: grouped by type, flagged items tab
- Document viewing: signed URL, serves original DOCX for formatting
- Submission periods: create, list, open/lock lifecycle
- Cadence-based KPI filtering in period creation
- Results entry: numeric + binary KPIs, exemption claims, per-row save, status calculation
- Exemption workflow: vendor claims → pending → operator approves/declines
- 12-month seed data (Jul 2025 – Jun 2026) for testing

### Next to build (in priority order)
1. **Exemption review UI** — operator screen to approve/decline pending exemption claims. Backend (`reviewExemption` mutation) already done. Need a UI — likely a filtered view on the period results page showing only pending exemptions, with approve/decline buttons per row.
2. **Re-run AI extraction** on existing contract — backfills `result_type` on the 154 KPIs (all currently default to 'numeric').
3. **Vendor portal** — magic link auth at `/portal/[token]`, vendors submit results without an internal login account.
4. **Email reminders** — Resend integration, send vendor reminder N days before period due date with magic link.
5. **Credit calculator** — read `credit_formula / credit_per_unit / credit_cap_amount` on breached contractual KPIs, calculate service credit per period.
6. **Vendor scorecard** — performance trend across periods, breach rate, top offending KPIs.
7. **Bulk CSV/Excel submission** — downloadable template, upload-and-parse server-side.

### Before launch
- Stripe billing integration
- Email notifications (Resend) — extraction complete, renewal alerts
- Admin view — waitlist submissions, promo granted flag
- Remove "Coming Soon" from landing page
- Launch LinkedIn post

---

## Landing page (`app/page.tsx`)
- Design: cream (#faf8f3) bg, teal (#0d9488) primary, DM Serif Display headings
- **No sign-in link** — intentional, public cannot access the app from the live site
- Waitlist form → `POST /api/waitlist` → `waitlist` table
- 3-months-free offer for early waitlist signups
- Origin story headline: "Built by someone who has lived it — on both sides"
