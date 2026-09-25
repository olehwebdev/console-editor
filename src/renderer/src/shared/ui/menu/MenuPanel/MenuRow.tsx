// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion } from 'motion/react';
import type { RefObject } from 'react';
import { CheckIcon } from '@/shared/config/icons';
import { cn, SPRING_LAYOUT } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import type { MenuAction } from '../types';

interface MenuRowProps {
  item: MenuAction;
  index: number;
  isActive: boolean;
  /** Shared by the panel's rows, so the highlight glides between them. */
  highlightId: string;
  reduce: boolean;
  /** Some row is a toggle: every row keeps a check slot. */
  hasChecks: boolean;
  /** Some row has an icon: the others keep its slot empty. */
  hasIcons: boolean;
  itemsRef: RefObject<(HTMLDivElement | null)[]>;
  setActive: (index: number) => void;
  choose: (index: number) => void;
}

/** One action in the panel. */
export function MenuRow({ item, index, isActive, highlightId, reduce, hasChecks, hasIcons, itemsRef, setActive, choose }: MenuRowProps) {
  return (
    <div
      ref={(el) => {
        itemsRef.current[index] = el;
      }}
      role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={item.checked}
      aria-disabled={item.disabled || undefined}
      tabIndex={-1}
      data-active={isActive || undefined}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' && !item.disabled && !isActive) setActive(index);
      }}
      onClick={() => choose(index)}
      className={cn(
        'relative isolate flex h-7 cursor-default select-none items-center gap-2 rounded-lg px-2 outline-none',
        item.danger ? 'text-danger' : 'text-fg',
        item.disabled && 'opacity-40',
      )}
    >
      {isActive ? (
        <motion.span
          aria-hidden
          layoutId={highlightId}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className={cn('absolute inset-0 -z-10 rounded-lg', item.danger ? 'bg-danger/15' : 'bg-pressed')}
        />
      ) : null}
      {hasChecks ? <Icon icon={CheckIcon} size={14} className={cn('text-accent', !item.checked && 'invisible')} /> : null}
      {hasIcons ? (
        item.icon ? (
          <Icon icon={item.icon} size={16} className={item.danger ? 'text-danger' : 'text-fg-muted'} />
        ) : (
          <span className="size-4 shrink-0" />
        )
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.shortcut?.length ? <Kbd keys={item.shortcut} className="ml-6" /> : null}
    </div>
  );
}
