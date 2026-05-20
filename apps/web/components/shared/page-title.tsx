// VericonIQ — <PageTitle> primitive (drop into components/shared/page-title.tsx)
//
// Standardizes page headers across every dashboard route.
// DM Serif Display title, optional eyebrow + subtitle + right-aligned action slot.
//
// Usage:
//   <PageTitle
//     eyebrow="MyPropIQ · Tuesday 20 May"
//     subtitle="7 active vendors · 16 contracts under management · $7.7M annual value"
//     actions={
//       <>
//         <Button variant="ghost"><Upload className="size-4 mr-2" />Upload contract</Button>
//         <Button><Plus className="size-4 mr-2" />Add vendor</Button>
//       </>
//     }
//   >
//     Portfolio overview
//   </PageTitle>

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageTitle({
  children,
  eyebrow,
  subtitle,
  actions,
  className,
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-eyebrow text-primary mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[32px] font-normal leading-[1.1] text-ink m-0">
          {children}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>}
    </div>
  );
}
