// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { Highlighted } from './Highlighted';
import type { ItemRow } from './types';

interface PaletteOptionProps {
  row: ItemRow;
  /** The virtual row's size and offset. */
  style: CSSProperties;
  isActive: boolean;
  /** How many options the whole list has. */
  count: number;
  /** Some option has an icon: the others keep its slot empty. */
  hasIcons: boolean;
  id: string;
  /** The id of the group name that describes the option. */
  describedBy: string;
  onHover: (ordinal: number) => void;
  onRun: (ordinal: number) => void;
}

/** One command in the result list. */
export function PaletteOption({ row, style, isActive, count, hasIcons, id, describedBy, onHover, onRun }: PaletteOptionProps) {
  const { item, indices } = row.result;
  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      // Only a window of rows is in the DOM: give the real count and position, and the group name.
      aria-setsize={count}
      aria-posinset={row.ordinal + 1}
      aria-describedby={describedBy}
      onPointerMove={() => {
        if (!isActive) onHover(row.ordinal);
      }}
      onClick={() => onRun(row.ordinal)}
      className="absolute inset-x-1.5 top-0 flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5"
      style={style}
    >
      {item.icon ? (
        <Icon icon={item.icon} size={16} className={cn('transition-colors duration-100', isActive ? 'text-fg' : 'text-fg-muted')} />
      ) : hasIcons ? (
        <span className="size-4 shrink-0" />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-fg">
        <Highlighted text={item.label} indices={indices} />
      </span>
      {item.hint ? <span className="max-w-[45%] shrink-0 truncate text-xs text-fg-subtle">{item.hint}</span> : null}
      {item.shortcut?.length ? <Kbd keys={item.shortcut} className="shrink-0" /> : null}
    </div>
  );
}
