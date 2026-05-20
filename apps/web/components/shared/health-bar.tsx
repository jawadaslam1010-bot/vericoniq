// VericonIQ — <HealthBar> primitive (drop into components/shared/health-bar.tsx)
//
// 80px bar + numeric value, color-graded by score (≥80 met, ≥60 risk, else breach).
// Used in vendor lists, dashboards, and vendor detail headers.

import { cn } from '@/lib/utils';

function toneFor(value: number) {
  if (value >= 80) return { wrap: 'text-status-met-text',    bar: 'bg-status-met-dot'    };
  if (value >= 60) return { wrap: 'text-status-risk-text',   bar: 'bg-status-risk-dot'   };
  return                   { wrap: 'text-status-breach-text', bar: 'bg-status-breach-dot' };
}

export function HealthBar({
  value,
  width = 80,
  showNumber = true,
  className,
}: {
  value: number;
  width?: number;
  showNumber?: boolean;
  className?: string;
}) {
  const tone = toneFor(value);
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div
        className="h-1.5 rounded-full overflow-hidden bg-page"
        style={{ width }}
      >
        <div
          className={cn('h-full transition-all duration-500', tone.bar)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showNumber && (
        <span
          className={cn('font-bold tabular-nums min-w-[24px]', tone.wrap)}
        >
          {value}
        </span>
      )}
    </div>
  );
}
