import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import type { ComponentPropsWithRef } from 'react';
import { cn, EASE_OUT } from '@/shared/lib';
import { INSTANT } from './constants';

type MotionConflicts = 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd';

const EXPAND: Transition = {
  height: { duration: 0.22, ease: EASE_OUT },
  opacity: { duration: 0.16, ease: EASE_OUT },
};

export interface CollapsibleContentProps extends Omit<ComponentPropsWithRef<'div'>, MotionConflicts> {
  open: boolean;
  /** Keep the children mounted (inert) while closed, e.g. to preserve scroll or virtualizer state. */
  keepMounted?: boolean;
}

/**
 * The animated body of a collapsible region: height 0 ↔ auto with a fade.
 * Unmounts its children when closed unless `keepMounted`. Clips with
 * `overflow: clip`, so nested sticky headers still stick to the outer scroller.
 */
export function CollapsibleContent({ open, keepMounted = false, className, children, ...rest }: CollapsibleContentProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? INSTANT : EXPAND;
  const cls = cn('overflow-clip', className);

  if (keepMounted) {
    return (
      <motion.div
        initial={false}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={transition}
        inert={!open}
        aria-hidden={!open || undefined}
        data-state={open ? 'open' : 'closed'}
        className={cls}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          data-state="open"
          className={cls}
          {...rest}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
