# Contractly — Sprint 1 Setup Guide

## Prerequisites

- Node.js 18+ (`node -v`)
- pnpm 9+ (`npm install -g pnpm`)
- A Supabase account (supabase.com)

---

## Step 1 — Install dependencies

```bash
cd /path/to/Contractly
pnpm install
```

---

## Step 2 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. **Region: ap-southeast-2 (Sydney)** — this is mandatory, do not use any other region
3. Set a strong database password and save it
4. Wait for the project to be provisioned (~2 minutes)

---

## Step 3 — Run the SQL migration

1. In the Supabase dashboard, go to **SQL Editor**
2. Open `supabase/migrations/0001_initial_schema.sql`
3. Paste the entire contents into the SQL Editor
4. Click **Run**
5. Confirm no errors

**What this creates:**
- `organisations`, `users`, `vendors`, `audit_logs` tables
- RLS policies on all tables
- `updated_at` trigger
- Audit logging trigger on `vendors`
- `custom_access_token_hook` function (JWT org_id claim)
- `contracts` storage bucket (private, 50 MB limit)

---

## Step 4 — Configure the Custom Access Token Hook

This is required for RLS to work. Without it, `auth.jwt() ->> 'org_id'` returns null and all data queries fail.

1. In Supabase dashboard → **Authentication** → **Hooks**
2. Find **Custom Access Token** hook
3. Set the hook to: `public.custom_access_token_hook`
4. Click Save

---

## Step 5 — Set up environment variables

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string → **Transaction** pooler (port 6543) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

Leave `AWS_*`, `RESEND_*`, `INNGEST_*`, and `STRIPE_*` blank for now — they're not needed until Sprint 2+.

---

## Step 6 — Configure Supabase Auth

In Supabase Dashboard → **Authentication** → **Settings**:

1. Set **Site URL** to `http://localhost:3000` (for development)
2. Under **Redirect URLs**, add: `http://localhost:3000/auth/callback`
3. Under **Email**, enable both **Email** and **Magic Link** auth

---

## Step 7 — Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 8 — Verify Sprint 1 success criteria

Go through each item:

- [ ] Sign up at `/signup` — creates org + user, sends confirmation email
- [ ] Confirm email → redirected to `/dashboard`
- [ ] Sign in via magic link at `/login`
- [ ] Authenticated user sees `/dashboard`
- [ ] Create a vendor at `/vendors/new`
- [ ] Vendor list at `/vendors` shows only your org's vendors
- [ ] Upload a file to Supabase Storage via the `FileUpload` component (test from `/vendors/[id]`)
- [ ] In Supabase SQL Editor, run: `SELECT * FROM audit_logs;` — should see a record after creating a vendor
- [ ] Test cross-org isolation: create two orgs, confirm each only sees its own data

---

## Adding additional shadcn/ui components

The UI components in `apps/web/components/ui/` were written manually. To add more shadcn components:

```bash
cd apps/web
pnpm dlx shadcn@latest add <component-name>
# e.g. pnpm dlx shadcn@latest add dialog
```

Or install all needed for Sprint 2+:

```bash
pnpm dlx shadcn@latest add dialog table form separator tooltip popover
```

---

## Additional Radix UI packages needed

The UI components use several Radix UI primitives. Install them:

```bash
cd apps/web
pnpm add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-tabs \
  @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-avatar \
  @hookform/resolvers
```

---

## Project structure

```
Contractly/
  apps/
    web/                    Next.js 14 application
      app/
        (auth)/             Login, signup pages
        (dashboard)/        Authenticated app routes
        api/                tRPC + REST API routes
        auth/callback/      Supabase auth callback
      components/
        ui/                 shadcn/ui components
        shared/             Navigation, FileUpload
        vendors/            VendorForm
      lib/
        supabase/           Browser + server clients
        trpc/               tRPC client + provider
        utils.ts            Date, currency formatters
      server/
        trpc.ts             tRPC init + context
        routers/            vendors.ts, _app.ts
      middleware.ts         Route protection
  packages/
    db/                     Drizzle ORM schema + client
    types/                  Shared TypeScript types
  supabase/
    migrations/
      0001_initial_schema.sql  Run this in Supabase SQL Editor
  SETUP.md                  This file
```

---

## Sprint 2 prerequisites

Before starting Sprint 2 (AI extraction pipeline), you'll also need:
- AWS account with Textract access in ap-southeast-2
- Resend account (for emails)
- Inngest account (for background jobs)

---

## Architecture decisions

- **No org_id in URLs** — tenant isolation is via JWT claims only
- **Signed URLs** — all document downloads use 1-hour signed URLs, never public URLs
- **RLS at database layer** — even a bug in app code cannot expose cross-org data
- **Audit triggers** — PostgreSQL triggers write audit records, not application code
- **Soft deletes on vendors** — `deleted_at` preserves audit trail
