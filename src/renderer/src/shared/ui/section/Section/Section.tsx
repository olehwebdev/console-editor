import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useId, useState } from 'react';
import { icons } from '@/shared/config';
import { cn, SPRING_SWAP } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { CollapsibleContent } from './CollapsibleContent';
import { INSTANT } from './constants';
import { SectionTitle } from './SectionTitle';
import type { SectionProps } from './types';

/**
 * Sidebar section: 28 px caps header with a rotating chevron, optional count
 * pill and hover actions, over a body that expands/collapses with a height
 * animation. The root carries `data-state="open|closed"`, so a filling
 * section can do `data-[state=open]:flex-1`.
 */
export function Section({
  title,
  count,
  countTone = 'neutral',
  actions,
  actionsVisible = 'hover',
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  sticky = false,
  collapsible = true,
  keepMounted = false,
  headerClassName,
  contentClassName,
  className,
  children,
  ...rest
}: SectionProps) {
  const reduce = useReducedMotion();
  const [internal, setInternal] = useState(defaultOpen);
  const open = !collapsible || (openProp ?? internal);
  const id = useId();
  const headerId = `${id}-header`;
  const contentId = `${id}-content`;

  const toggle = useCallback(() => {
    const next = !open;
    if (openProp === undefined) setInternal(next);
    onOpenChange?.(next);
  }, [open, openProp, onOpenChange]);

  const titleRow = <SectionTitle title={title} count={count} countTone={countTone} />;

  return (
    <section data-state={open ? 'open' : 'closed'} aria-labelledby={headerId} className={cn('flex flex-col', className)} {...rest}>
      <div
        className={cn(
          'group/section-header flex h-7 shrink-0 items-center gap-1 px-1.5',
          sticky && 'sticky top-0 z-10 bg-surface',
          headerClassName,
        )}
      >
        {collapsible ? (
          <button
            id={headerId}
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={toggle}
            className="flex h-6 min-w-0 flex-1 items-center gap-1 rounded-md pl-0.5 pr-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60"
          >
            <span aria-hidden className="grid size-4 shrink-0 place-items-center text-fg-subtle transition-colors group-hover/section-header:text-fg-muted">
              <motion.span
                className="grid place-items-center"
                initial={false}
                animate={{ rotate: open ? 90 : 0 }}
                transition={reduce ? INSTANT : SPRING_SWAP}
              >
                <Icon icon={icons.ChevronRightIcon} size={12} strokeWidth={2} />
              </motion.span>
            </span>
            {titleRow}
          </button>
        ) : (
          <h3 id={headerId} className="flex h-6 min-w-0 flex-1 items-center gap-1 pl-1.5 pr-1">
            {titleRow}
          </h3>
        )}
        {actions ? (
          <div
            className={cn(
              'flex shrink-0 items-center gap-0.5 transition-opacity duration-150 ease-out-expo',
              actionsVisible === 'hover' &&
                'opacity-0 group-hover/section-header:opacity-100 group-focus-within/section-header:opacity-100',
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
      <CollapsibleContent id={contentId} open={open} keepMounted={keepMounted} className={contentClassName}>
        {children}
      </CollapsibleContent>
    </section>
  );
}

/** Alias of <Section> (the design-system contract names both). */
export const Collapsible = Section;
