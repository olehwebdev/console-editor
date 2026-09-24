import type { ReactNode } from 'react';
import { cn } from '@/shared/lib';
import { COUNT_TONE } from './constants';
import type { SectionCountTone } from './types';

/** The header's caps label and its optional count pill. */
export function SectionTitle({ title, count, countTone }: { title: ReactNode; count?: number; countTone: SectionCountTone }) {
  return (
    <>
      <span className="label-caps min-w-0 truncate transition-colors group-hover/section-header:text-fg-muted">{title}</span>
      {count !== undefined ? (
        <span
          className={cn(
            'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10.5px] font-medium leading-none tabular-nums',
            COUNT_TONE[countTone],
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );
}
