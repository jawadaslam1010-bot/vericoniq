'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Sparkles, CreditCard } from 'lucide-react'
import { api } from '@/lib/trpc/client'

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit?: string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const tone = pct >= 100 ? 'var(--status-breach-dot)' : pct >= 80 ? 'var(--status-risk-dot)' : 'var(--primary)'
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1">
        <span className="text-ink-soft">{label}</span>
        <span className="text-muted tabular-nums">
          {used}{unit ?? ''} / {limit == null ? '∞' : `${limit}${unit ?? ''}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-page overflow-hidden">
        <div className="h-full rounded-full" style={{ width: limit ? `${pct}%` : '4%', background: tone }} />
      </div>
    </div>
  )
}

export function BillingSection({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading } = api.billing.getOverview.useQuery()
  const [busy, setBusy] = useState<string | null>(null)

  const checkout = api.billing.createCheckoutSession.useMutation({
    onSuccess: (r) => { if (r.url) window.location.href = r.url },
    onError: (e) => { toast.error(e.message); setBusy(null) },
  })
  const portal = api.billing.createPortalSession.useMutation({
    onSuccess: (r) => { if (r.url) window.location.href = r.url },
    onError: (e) => { toast.error(e.message); setBusy(null) },
  })

  if (isLoading || !data) {
    return (
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-[15px] font-semibold text-ink mb-2">Plan & billing</h2>
        <p className="text-[13px] text-muted">Loading…</p>
      </section>
    )
  }

  const isPro = data.plan === 'professional'
  const isEnterprise = data.plan === 'enterprise'
  const storageMbUsed = Math.round(data.usage.storageBytes / (1024 * 1024) * 10) / 10

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[15px] font-semibold text-ink">Plan & billing</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
          isPro || isEnterprise ? 'bg-primary-50 text-primary' : 'bg-hover text-ink-soft'
        }`}>
          {isEnterprise ? 'Enterprise' : isPro ? 'Professional' : 'Free'}
        </span>
      </div>
      <p className="text-[12.5px] text-muted mb-5">
        {isEnterprise
          ? 'Custom enterprise agreement.'
          : isPro
          ? `Subscription ${data.subscriptionStatus ?? 'active'}.`
          : data.freeTierExpired
          ? 'Your free tier has ended — upgrade to keep building your portfolio.'
          : data.trialEndsAt
          ? `Free tier ends ${fmtDate(data.trialEndsAt)}.`
          : 'Free tier.'}
      </p>

      {/* Usage */}
      <div className="space-y-3 mb-6 max-w-md">
        <UsageBar label="Vendors" used={data.usage.vendors} limit={data.limits.vendors} />
        <UsageBar label="Contracts" used={data.usage.contracts} limit={data.limits.contracts} />
        <UsageBar label="Storage (MB)" used={storageMbUsed} limit={data.limits.storageMb} />
      </div>

      {/* Actions */}
      {isAdmin && !isEnterprise && (
        <div className="flex flex-wrap items-center gap-2">
          {!isPro && (
            <>
              <button
                onClick={() => { setBusy('monthly'); checkout.mutate({ interval: 'monthly' }) }}
                disabled={busy != null || !data.billingEnabled}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-[13px] font-semibold px-4 py-2 hover:bg-primary-hover disabled:opacity-50"
              >
                {busy === 'monthly' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Upgrade to Pro — $299/mo
              </button>
              <button
                onClick={() => { setBusy('annual'); checkout.mutate({ interval: 'annual' }) }}
                disabled={busy != null || !data.billingEnabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-medium text-ink-soft px-4 py-2 hover:bg-hover disabled:opacity-50"
              >
                {busy === 'annual' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Annual — $2,990/yr (2 months free)
              </button>
            </>
          )}
          {isPro && (
            <button
              onClick={() => { setBusy('portal'); portal.mutate() }}
              disabled={busy != null || !data.billingEnabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[13px] font-medium text-ink-soft px-4 py-2 hover:bg-hover disabled:opacity-50"
            >
              {busy === 'portal' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              Manage billing
            </button>
          )}
          {!data.billingEnabled && (
            <span className="text-[11.5px] text-faint">Billing is not configured in this environment yet.</span>
          )}
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-faint">
        Need more than Pro — unlimited vendors, SSO, custom terms?{' '}
        <a href="mailto:hello@vericoniq.com?subject=VericonIQ%20Enterprise" className="text-primary hover:underline">Talk to us about Enterprise</a>.
      </p>
    </section>
  )
}
