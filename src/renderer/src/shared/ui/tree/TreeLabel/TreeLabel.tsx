import { useMemo, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib';
import { findMatches } from './findMatches';
import { normalize } from './normalize';
import type { TextRange } from './types';

export interface TreeLabelProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  text: string;
  /** Highlight every case-insensitive occurrence of this substring (e.g. the filter query). */
  highlight?: string;
  /** Explicit ranges to highlight instead (e.g. from a fuzzy matcher). Wins over `highlight`. */
  ranges?: readonly TextRange[];
  /** Classes for the highlighted runs. */
  markClassName?: string;
}

/**
 * A truncating label that highlights the part matching the filter, for tree
 * and list rows. Carries `data-tree-label` (style hook).
 */
export function TreeLabel({ text, highlight, ranges, markClassName, className, ...rest }: TreeLabelProps) {
  const parts = useMemo(() => {
    const runs = normalize(ranges ?? findMatches(text, highlight), text.length);
    if (!runs.length) return null;
    const out: ReactNode[] = [];
    let at = 0;
    runs.forEach(([s, e], i) => {
      if (s > at) out.push(text.slice(at, s));
      out.push(
        <mark key={i} className={cn('rounded-[2px] bg-accent/15 font-medium text-accent', markClassName)}>
          {text.slice(s, e)}
        </mark>,
      );
      at = e;
    });
    if (at < text.length) out.push(text.slice(at));
    return out;
  }, [text, highlight, ranges, markClassName]);

  return (
    <span data-tree-label="" className={cn('min-w-0 truncate', className)} {...rest}>
      {parts ?? text}
    </span>
  );
}
