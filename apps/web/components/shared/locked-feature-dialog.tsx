'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FEATURE_MIN_PLAN, type PlanFeature } from '@contractly/types'
import { FEATURE_COPY } from './locked-feature'

const PLAN_LABEL: Record<string, string> = {
  essentials: 'Essentials',
  professional: 'Professional',
}

// Dialog variant of the locked-feature panel — for locked buttons inside a
// working page (send portal link, invite teammate, export). Dismissing it
// leaves the user exactly where they were.
export function LockedFeatureDialog({
  feature,
  open,
  onOpenChange,
}: {
  feature: PlanFeature
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const copy = FEATURE_COPY[feature]
  const minPlan = FEATURE_MIN_PLAN[feature]
  const planLabel = PLAN_LABEL[minPlan] ?? minPlan

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center px-8 py-10">
        <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <DialogTitle className="font-serif font-normal text-[22px] leading-snug text-ink text-center">
          {copy.headline}
        </DialogTitle>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{copy.pitch}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-100 px-3.5 py-1.5 text-[12px] font-semibold text-primary mx-auto">
          <Sparkles className="h-3.5 w-3.5" />
          Available on the {planLabel} plan and above
        </div>
        <div className="mt-5 flex items-center justify-center gap-4">
          <Link
            href="/settings?tab=billing"
            className="rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Upgrade to {planLabel}
          </Link>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Not now
          </button>
        </div>
        <p className="mt-4 text-[11.5px] text-muted">{copy.foot}</p>
      </DialogContent>
    </Dialog>
  )
}
