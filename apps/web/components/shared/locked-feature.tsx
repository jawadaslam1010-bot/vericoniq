import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { FEATURE_MIN_PLAN, type PlanFeature } from '@contractly/types'

// Benefit-led copy for each gated feature. Shown wherever a user on a lower
// plan reaches the feature — as a full page panel or inside a dialog.
export const FEATURE_COPY: Record<PlanFeature, { headline: string; pitch: string; foot: string }> = {
  vendorPortal: {
    headline: 'Let your vendors do the typing',
    pitch: 'Send a secure magic link and vendors submit their results directly, with evidence attached. No accounts, no spreadsheets, no chasing.',
    foot: 'Your submission periods are already set up — portal links go out the moment you upgrade.',
  },
  creditRecovery: {
    headline: 'Stop leaving money on the table',
    pitch: "When a KPI is breached, VericonIQ calculates exactly what you're owed using your contract's own formula, ready to claim from your vendor.",
    foot: "Your extracted credit formulas are already saved — they'll light up the moment you upgrade.",
  },
  renewalAlerts: {
    headline: 'Never miss a notice window again',
    pitch: 'Get warned at 90, 60 and 30 days before every deadline, expiry and auto-renewal across your portfolio.',
    foot: 'Your notice deadlines are already extracted — alerts start the day you upgrade.',
  },
  reports: {
    headline: 'Take your scorecards to the meeting',
    pitch: 'Performance reports across your whole portfolio, ready to share with stakeholders and vendors.',
    foot: 'Your performance data is already being collected — reports build themselves when you upgrade.',
  },
  teamInvites: {
    headline: 'Contract management is a team sport',
    pitch: 'Invite colleagues with admin, manager or viewer roles so the whole team works from the same source of truth.',
    foot: 'Invitations take under a minute once you upgrade.',
  },
}

const PLAN_LABEL: Record<string, string> = {
  essentials: 'Essentials',
  professional: 'Professional',
}

export function LockedFeaturePanel({ feature, compact = false }: { feature: PlanFeature; compact?: boolean }) {
  const copy = FEATURE_COPY[feature]
  const minPlan = FEATURE_MIN_PLAN[feature]
  const planLabel = PLAN_LABEL[minPlan] ?? minPlan

  return (
    <div className={`bg-surface border border-border rounded-2xl text-center mx-auto ${compact ? 'px-6 py-8 max-w-lg' : 'px-8 py-12 sm:px-10 sm:py-14 max-w-2xl mt-6'}`}>
      <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-5">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h2 className="font-serif text-[24px] leading-snug text-ink">{copy.headline}</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-soft max-w-md mx-auto">{copy.pitch}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-100 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Available on the {planLabel} plan and above
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <Link
          href="/settings?tab=billing"
          className="rounded-lg bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Upgrade to {planLabel}
        </Link>
        <Link
          href="/settings?tab=billing"
          className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Compare plans
        </Link>
      </div>
      <p className="mt-5 text-[12px] text-muted">{copy.foot}</p>
    </div>
  )
}
