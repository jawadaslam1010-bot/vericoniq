# VericonIQ — End-to-End Test Plan

Executed by Claude against the dev server (production database) with live spot-checks
on vericoniq.com. Every case gets a PASS / FAIL / BLOCKED verdict with evidence.
Test data is namespaced `E2E-*` and fully purged in teardown.

## Fixtures

- **Org A** "E2E Alpha Pty Ltd (delete me)" — admin `veriqa.e2e.admin@mailinator.com`,
  manager `veriqa.e2e.manager@mailinator.com`, viewer `veriqa.e2e.viewer@mailinator.com`
- **Org B** "E2E Bravo Pty Ltd (delete me)" — single admin (for isolation tests)
- **Synthetic contract PDF** (generated with pdfkit, ~12 pages): "E2E Managed Services
  Agreement" with planted facts: monthly value $10,000; notice deadline ~30 days out;
  auto-renewal 12 months; KPIs incl. `Uptime ≥ 99.9% (5% MRC credit, cap 8% MRC)`,
  `P1 response ≤ 30 min (per-unit $200)`, binary `Monthly report delivered`,
  quarterly `CSAT ≥ 4.0`. Expected extraction results derived from these.

## A. Public surface & gate

| # | Case | Expected |
|---|------|----------|
| A1 | `/` logged out | Marketing landing (hero, stats, security, 4-tier pricing), no auth required |
| A2 | `/about` logged out | About page public |
| A3 | `/dashboard` without beta cookie (prod) | Redirect to `/beta` |
| A4 | Wrong beta password | 401, no cookie |
| A5 | Correct beta password | Cookie set → lands on `/login`; return visit to `/` while logged in → `/dashboard` |
| A6 | Waitlist form submit | 200; row in `waitlist` table |

## B. Accounts, roles & team

| # | Case | Expected |
|---|------|----------|
| B1 | Signup Org A via UI | Org created, plan=starter, `trial_ends_at` = now + 3 months, user role=admin |
| B2 | Weak password (< 12 chars) | Rejected client+server |
| B3 | Duplicate email signup | 409 EMAIL_EXISTS |
| B4 | Admin invites manager + viewer | Invitation rows pending; emails dispatched to mailinator; token links valid |
| B5 | Accept invite (manager) | Account created in Org A with role=manager; invitation marked accepted |
| B6 | Re-use accepted invite token | Rejected ("no longer valid") |
| B7 | Revoked invite token | Rejected |
| B8 | Viewer: attempt vendor create / KPI edit / period create / invite / org update | All FORBIDDEN (server-side, not just hidden UI) |
| B9 | Manager: vendor+contract CRUD allowed; team invite / role change / billing checkout | CRUD ok; admin-only mutations FORBIDDEN |
| B10 | Last-admin guard | Demoting/removing the only admin rejected |
| B11 | Settings team panel | Lists 3 members with correct roles + emails |

## C. Contract lifecycle & AI extraction

| # | Case | Expected |
|---|------|----------|
| C1 | Create vendor + contract, upload synthetic PDF | Document stored; appears in Documents tab |
| C2 | Run AI extraction | Status pending→processing→complete; no invalid-JSON/truncation errors |
| C3 | Extraction accuracy | ≥ 90% of planted KPIs found; Uptime credit terms (5% MRC, cap 8%) captured; monthly value $10,000 and notice deadline captured or editable |
| C4 | Extracted KPIs inactive by default | `is_active=false`, `added_by=ai` until reviewed |
| C5 | KPI review: activate planted KPIs, edit one target | Persisted; Inbox "AI KPIs awaiting review" count drops to 0 |
| C6 | Oversized file (> plan cap) | Upload rejected with plan message |

## D. Submission period & vendor portal round-trip

| # | Case | Expected |
|---|------|----------|
| D1 | Create monthly period | Blank results seeded only for due-cadence KPIs (quarterly CSAT excluded in off-quarter month) |
| D2 | Generate portal link (email to mailinator vendor address) | Token `viq_*`; email received with working link |
| D3 | Open portal logged-out | Loads without auth or beta cookie; KPI list matches period |
| D4 | Vendor submits: uptime 99.5% (breach), P1 28min (met), report=yes (met), one exemption claim with reason | Saves; progress bar correct; submit locks portal into submitted state |
| D5 | Manager notification email | "Submission received" email dispatched with correct counts |
| D6 | Scoring math | uptime→breach; P1→met/risk per 5% rule; binary→met; exemption→pending, status unchanged |
| D7 | Credit math | Uptime credit = $10,000 × 5% = **$500** (under 8% cap); P1 no credit (met); totals match on breaches tab + vendor header + dashboard |
| D8 | Exemption review: decline | Status declined; result stays breach; credit stands |
| D9 | Lock period | Vendor lock email dispatched with health %; period immutable; portal read-only |
| D10 | Expired/invalid portal token | 401 on save; invalid token page renders |
| D11 | Health score | Matches hand calc: (met+risk)/(total−exempt) from locked period |

## E. Dashboards, reports, inbox, search

| # | Case | Expected |
|---|------|----------|
| E1 | Dashboard tiles | Vendor count, contract count, annual value, credits ($500), breach count all correct |
| E2 | Vendor scorecard | Health %, outcome bars, breach list consistent with D |
| E3 | Reports page | Per-vendor row: health, value, breaches, est. credits $500, next deadline date |
| E4 | Inbox | Shows: pending exemption (before D8), notice deadline ≤45d entry; counts drop after actions |
| E5 | Search ⌘K | Finds planted vendor, contract, KPI by partial name; deep links navigate correctly |
| E6 | Breaches tab | Uptime breach listed with result vs target and $500 credit |
| E7 | Activity tab | Events for contract added, period created, portal opened, results, lock |

## F. Alerts (cron) & emails

| # | Case | Expected |
|---|------|----------|
| F1 | Cron without auth header | 401 (CRON_SECRET enforced) |
| F2 | Cron with secret | Contract with ~30-day deadline → reminder email to admin+manager; `renewal_reminder_stage=30` |
| F3 | Cron re-run | No duplicate email (stage dedupe) |
| F4 | Email audit | All dispatched emails (invite ×2, portal link, submission, lock, renewal) received in mailinator with correct branding/links |

## G. Billing & plan limits (no live card)

| # | Case | Expected |
|---|------|----------|
| G1 | Free limits | 3rd vendor and 4th contract rejected with upgrade message |
| G2 | Storage caps | File > 10MB rejected on starter |
| G3 | Trial expiry (flip `trial_ends_at` past) | Banner shows; creates/uploads blocked; data readable; restore |
| G4 | Set Org A plan=essentials (SQL) | Portal link generation FORBIDDEN with upgrade message; credit surfaces show "Available on Professional"; limits 5/15 enforced |
| G5 | Set plan=professional | Portal + credits restored; caps 25/100 |
| G6 | Billing overview (settings) | Correct plan badge, usage bars, both upgrade cards (Essentials + Pro) when on free |
| G7 | Checkout session creation | With Stripe env configured: returns live checkout URL for each tier/interval (URL created, not completed — completion is the FOUNDER100 manual test) |
| G8 | Webhook signature | Unsigned POST to `/api/stripe/webhook` → 400 |

## H. Tenant isolation & platform admin

| # | Case | Expected |
|---|------|----------|
| H1 | Org B admin queries Org A data (vendors.get, contract, period, results by id via API) | NOT_FOUND/denied on every probe |
| H2 | Org B search | Zero results for Org A's names |
| H3 | Org B portal token cannot touch Org A results | Rejected |
| H4 | Non-platform-admin hits `/admin` | 404 (not 403) |
| H5 | Platform admin (owner) `/admin` | Org list shows E2E orgs; drilldown works; actions logged to `platform_audit_log` |
| H6 | Impersonation | Banner shows; exit returns to /admin; both events audit-logged |

## I. Teardown

Purge Org A + Org B: audit rows, org cascade (session_replication_role trick), auth
users, mailinator inboxes noted. Verify orgs gone and owner org untouched.

## Known exclusions

Live card checkout completion (owner runs FOUNDER100), inbox rendering in
Gmail/Outlook (dispatch + mailinator receipt verified instead), Vercel's cron
schedule itself (manual trigger tested), load/perf testing.
