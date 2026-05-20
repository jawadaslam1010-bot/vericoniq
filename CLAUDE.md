# VericonIQ — Project Context for Claude

## What this project is
VericonIQ is an AI-powered contract performance intelligence SaaS. It reads commercial contracts, extracts KPIs and obligations using Claude AI, then tracks vendor performance against those targets period by period.

- **GitHub**: `jawadaslam1010-bot/vericoniq` (private)
- **Vercel**: auto-deploys from `main` — project name `vericoniq-web`
- **Domain**: vericoniq.com (VentraIP, A record → 216.150.1.1)
- **Supabase**: project was named "Contractly" — needs rename to VericonIQ (paused, needs unpausing)
- **Founder**: Jawad Aslam — jawad@mypropiq.com.au

## Stack
- **Monorepo**: Turborepo + pnpm (`apps/web`, `packages/db`, `packages/ai`)
- **Framework**: Next.js 14 App Router
- **Database**: Drizzle ORM → Supabase Postgres
- **Auth**: Supabase Auth
- **AI**: Anthropic Claude API — batched extraction (3 docs/call, 10k tokens/batch)
- **Fonts**: DM Sans (body) + DM Serif Display (headings)
- **UI**: Tailwind CSS + shadcn/ui

## Critical patterns — always follow these
1. Every route/layout that uses DB or env vars needs `export const dynamic = 'force-dynamic'` at the top
2. Supabase client must be created **inside** component/handler functions — never at module level
3. All env vars must be listed in `turbo.json` → `build.env` array for Vercel to pass them through
4. `useSearchParams()` requires `<Suspense>` wrapper in production builds
5. AI extraction: batched in groups of 3 docs, sequential calls, deduplicates key_terms by label
6. KPI `target_operator` must default to `'gte'` if AI returns null
7. KPI `added_by` CHECK constraint: only `'ai'` or `'manual'` — nothing else

## Database schema (key tables)
- `users`, `orgs`, `vendors`, `contracts`, `documents`, `kpis`, `kpi_results`, `key_terms`, `extraction_runs`
- `waitlist` — landing page feedback form (name, email UNIQUE, role, message, created_at)

### Waitlist table (run if not already created)
```sql
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

## Landing page (app/page.tsx)
- Design: Option B — cream (#fafaf8) bg, teal (#0d9488) primary, DM Serif Display headings
- No sign-in link on landing page (intentional)
- Feedback form → /api/waitlist → Supabase waitlist table
- 3 months free offer: submit feedback = email stored = free access at launch
- Story visible on page, Coming Soon badge is solid teal in nav

## App routes
- `/` — landing page (public)
- `/login` — auth
- `/dashboard` — main overview (auth required)
- `/dashboard/contracts` — cross-vendor contract list
- `/dashboard/vendors` — vendor list
- `/dashboard/vendors/[vendorId]` — vendor detail + AI extraction trigger
- `/dashboard/vendors/[vendorId]/kpis` — KPI register + performance tracking

---

## TODO — What to build next (in order)

### Do immediately
- [x] Create `waitlist` table in Supabase SQL Editor — DONE
- [x] Unpause and rename Supabase project to "VericonIQ" — DONE
- [ ] Confirm vericoniq.com DNS resolves to Vercel

### Next app features
- [ ] KPI review step — let user review/edit AI-extracted KPIs before saving
- [ ] KPI results — period-by-period performance data entry
- [ ] Service credit calculator — formula from contract applied to underperformance
- [ ] Vendor scorecard — weighted health score across all KPIs
- [ ] Renewal/deadline alerts — flag upcoming notice periods

### Before launch
- [ ] Add `promo_granted_at timestamptz` column to waitlist table
- [ ] Build logic to auto-grant 3 months free when waitlist email signs up
- [ ] Stripe billing integration for paid tiers
- [ ] Email notifications (Resend or similar) — extraction complete, renewal alerts, launch email to waitlist
- [ ] Admin view — see waitlist submissions, mark promo granted

### At launch
- [ ] Send launch email to everyone in waitlist table
- [ ] Remove/update "Coming Soon" banner and badge from landing page
- [ ] Write up launch post for LinkedIn (Jawad's profile)
