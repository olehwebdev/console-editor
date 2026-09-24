import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn, EASE_OUT } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';

type MotionConflicts = 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd';

export type EmptyStateSize = 'sm' | 'md';

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | MotionConflicts> {
  /** A Hugeicons glyph (drawn in a raised tile) or any node. */
  icon?: IconGlyph | ReactNode;
  title: ReactNode;
  /** Body: a sentence, or richer content (lists, steps). Rendered in a <div>. */
  children?: ReactNode;
  /** Buttons under the body. */
  actions?: ReactNode;
  /** `md` (default) for editor / preview panes, `sm` for sidebars. */
  size?: EmptyStateSize;
}

const SIZE: Record<EmptyStateSize, { tile: string; glyph: number; title: string; body: string }> = {
  sm: { tile: 'size-9 rounded-xl', glyph: 18, title: 'text-[13px] font-medium', body: 'text-xs' },
  md: { tile: 'size-12 rounded-2xl', glyph: 22, title: 'text-lg font-medium tracking-tight', body: 'text-[13px]' },
};

function isGlyph(value: unknown): value is IconGlyph {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'string';
}

const CONTAINER: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } } };
const ITEM: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.26, ease: EASE_OUT } },
};
const ITEM_REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
};

/**
 * Centered placeholder for empty panes: an icon tile with a soft ember glow,
 * a title, a body and optional actions, fading up in a short stagger on mount.
 */
export function EmptyState({ icon, title, children, actions, size = 'md', className, ...rest }: EmptyStateProps) {
  const reduce = useReducedMotion();
  const item = reduce ? ITEM_REDUCED : ITEM;
  const dims = SIZE[size];

  return (
    <motion.div
      variants={CONTAINER}
      initial="hidden"
      animate="shown"
      className={cn('mx-auto flex w-full max-w-sm flex-col items-center px-6 text-center', className)}
      {...rest}
    >
      {icon ? (
        <motion.div variants={item} className={cn('relative isolate', size === 'sm' ? 'mb-3' : 'mb-4')}>
          <span aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-accent/10 blur-xl" />
          <span
            aria-hidden
            className={cn('grid place-items-center border border-line bg-surface-raised text-fg-muted shadow-raised', dims.tile)}
          >
            {isGlyph(icon) ? <Icon icon={icon} size={dims.glyph} /> : icon}
          </span>
        </motion.div>
      ) : null}
      <motion.p variants={item} className={cn('text-fg', dims.title)}>
        {title}
      </motion.p>
      {children !== undefined && children !== null && children !== false ? (
        <motion.div variants={item} className={cn('mt-1.5 w-full leading-relaxed text-fg-muted', dims.body)}>
          {children}
        </motion.div>
      ) : null}
      {actions ? (
        <motion.div variants={item} className={cn('flex flex-wrap items-center justify-center gap-2', size === 'sm' ? 'mt-3' : 'mt-5')}>
          {actions}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
