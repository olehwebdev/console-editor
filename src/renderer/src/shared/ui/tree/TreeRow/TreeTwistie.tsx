// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useReducedMotion } from 'motion/react';
import type { MouseEvent } from 'react';
import { icons } from '@/shared/config';
import { SPRING_SWAP } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import type { TreeRowProps } from './types';

/**
 * A folder's chevron, turned by a spring as the row expands and toggling it
 * when clicked; a leaf gets an empty cell of the same width instead.
 */
export function TreeTwistie({ expanded, onToggle }: Pick<TreeRowProps, 'expanded' | 'onToggle'>) {
  const reduce = useReducedMotion();
  if (expanded === undefined) return <span aria-hidden className="-mr-0.5 size-4 shrink-0" />;

  const handleToggle = (event: MouseEvent) => {
    if (!onToggle) return;
    event.stopPropagation();
    onToggle();
  };

  return (
    <span
      aria-hidden
      onClick={handleToggle}
      className="-mr-0.5 grid size-4 shrink-0 place-items-center text-fg-subtle transition-colors group-hover/tree-row:text-fg-muted"
    >
      <motion.span
        className="grid place-items-center"
        initial={false}
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        <Icon icon={icons.ChevronRightIcon} size={12} strokeWidth={2} />
      </motion.span>
    </span>
  );
}
