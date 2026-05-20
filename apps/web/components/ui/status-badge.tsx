// VericonIQ — <StatusBadge> primitive (drop into components/ui/status-badge.tsx)
//
// Replaces every ad-hoc `bg-emerald-100 text-emerald-700` / `bg-amber-100 …`
// pattern across the dashboard. Reads from the `status-*` tokens already
// defined in tailwind.config.ts.
//
// Usage:
//   <StatusBadge status="met"    label="Met" />
//   <StatusBadge status="risk"   label="At risk" />
//   <StatusBadge status="breach" label="Breach" />
//   <StatusBadge status="stale"  label="Stale" />
//   <StatusBadge status="info"   label="Extracted" />
//   <StatusBadge status="met"    label="Active" dot={false} />

import { cn } from '@/lib/utils';

export type StatusKind = 'met' | 'risk' | 'breach' | 'stale' | 'info';

const STYLES: Record<StatusKind, { wrap: string; dot: string }> = {
  met: {
    wrap: 'bg-status-met-bg text-status-met-text border-status-met-border',
    dot:  'bg-status-met-dot',
  },
  risk: {
    wrap: 'bg-status-risk-bg text-status-risk-text border-status-risk-border',
    dot:  'bg-status-risk-dot',
  },
  breach: {
    wrap: 'bg-status-breach-bg text-status-breach-text border-status-breach-border',
    dot:  'bg-status-breach-dot',
  },
  stale: {
    wrap: 'bg-status-stale-bg text-status-stale-text border-status-stale-border',
    dot:  'bg-status-stale-dot',
  },
  info: {
    wrap: 'bg-status-info-bg text-status-info-text border-status-info-border',
    dot:  'bg-status-info-dot',
  },
};

export function StatusBadge({
  status,
  label,
  dot = true,
  size = 'sm',
  className,
}: {
  status: StatusKind;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap leading-none',
        size === 'lg' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11.5px]',
        s.wrap,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full flex-shrink-0', s.dot)} />}
      {label}
    </span>
  );
}
