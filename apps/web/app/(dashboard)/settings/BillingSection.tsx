'use client'

import { useEffect, useRef, useState } from 'react'
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
  const utils = api.useUtils()
  const { data, isLoading } = api.billing.getOverview.useQuery()
  const [busy, setBusy] = useState<string | null>(null)

  const reconcile = api.billing.reconcile.useMutation({
    onSuccess: (r) => {
      utils.billing.getOverview.invalidate()
      if (r.changed && r.plan && r.plan !== 'starter') toast.success(`Subscription confirmed — you're on ${r.plan}.`)
      setBusy(null)
    },
    onError: () => setBusy(null),
  })

  // After returning from Stripe Checkout, confirm the subscription directly —
  // don't rely solely on the webhook having arrived first.
  const reconciledOnce = useRef(false)
  useEffect(() => {
    if (reconciledOnce.current || !isAdmin) return
    if (typeof window !== 'undefined' && window.location.search.includes('billing=success')) {
      reconciledOnce.current = true
      reconcile.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const checkout = api.billing.createCheckoutSession.useMutation({
    onSuccess: (r) => { if (r.url) window.location.href = r.url },
    onError: (e) => { toast.error(e.message); setBusy(null) },
  })
  const startCheckout = (tier: 'essentials' | 'professional', interval: 'monthly' | 'annual') => {
    setBusy(`${tier}-${interval}`)
    checkout.mutate({ tier, interval })
  }
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
  const isEssentials = data.plan === 'essentials'
  const isEnterprise = data.plan === 'enterprise'
  const isPaid = isPro || isEssentials
  const storageMbUsed = Math.round(data.usage.storageBytes / (1024 * 1024) * 10) / 10

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[15px] font-semibold text-ink">Plan & billing</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
          isPaid || isEnterprise ? 'bg-primary-50 text-primary' : 'bg-hover text-ink-soft'
        }`}>
          {isEnterprise ? 'Enterprise' : isPro ? 'Professional' : isEssentials ? 'Essentials' : 'Free'}
        </span>
      </div>
      <p className="text-[12.5px] text-muted mb-5">
        {isEnterprise
          ? 'Custom enterprise agreement.'
          : isPaid
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
        <div className="space-y-3">
          {!isPro && (
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              {!isPaid && (
                <div className="rounded-lg border border-border p-4">
                  <div className="text-[13.5px] font-semibold text-ink">Essentials</div>
                  <div className="text-[12px] text-muted mt-0.5 mb-3">5 vendors · 15 contracts · tracking &amp; alerts</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startCheckout('essentials', 'monthly')}
                      disabled={busy != null || !data.billingEnabled}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[12.5px] font-semibold text-ink px-3 py-1.5 hover:bg-hover disabled:opacity-50"
                    >
                      {busy === 'essentials-monthly' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      $99/mo
                    </button>
                    <button
                      onClick={() => startCheckout('essentials', 'annual')}
                      disabled={busy != null || !data.billingEnabled}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[12.5px] font-medium text-ink-soft px-3 py-1.5 hover:bg-hover disabled:opacity-50"
                    >
                      {busy === 'essentials-annual' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      $990/yr
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-lg border-2 border-primary p-4">
                <div className="text-[13.5px] font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />Professional
                </div>
                <div className="text-[12px] text-muted mt-0.5 mb-3">25 vendors · 100 contracts · portal &amp; credit recovery</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startCheckout('professional', 'monthly')}
                    disabled={busy != null || !data.billingEnabled}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-[12.5px] font-semibold px-3 py-1.5 hover:bg-primary-hover disabled:opacity-50"
                  >
                    {busy === 'professional-monthly' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    $299/mo
                  </button>
                  <button
                    onClick={() => startCheckout('professional', 'annual')}
                    disabled={busy != null || !data.billingEnabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[12.5px] font-medium text-ink-soft px-3 py-1.5 hover:bg-hover disabled:opacity-50"
                  >
                    {busy === 'professional-annual' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    $2,990/yr
                  </button>
                </div>
              </div>
            </div>
          )}
          {isPaid && (
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
          {data.billingEnabled && !isPaid && (
            <button
              onClick={() => { setBusy('reconcile'); reconcile.mutate() }}
              disabled={busy != null}
              className="block text-[11.5px] text-muted hover:text-primary underline underline-offset-2 disabled:opacity-50"
            >
              {busy === 'reconcile' ? 'Checking subscription…' : 'Just upgraded? Refresh subscription status'}
            </button>
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
