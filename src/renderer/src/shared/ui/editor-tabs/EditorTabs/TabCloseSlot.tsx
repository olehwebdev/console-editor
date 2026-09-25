// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion } from 'motion/react';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { CONTENT, FADE, INSTANT } from './constants';

interface TabCloseSlotProps {
  id: string;
  label: string;
  active: boolean;
  dirty: boolean;
  reduce: boolean;
  onClose: (id: string) => void;
}

/** The dirty dot and the close button, sharing one slot: hovering the tab swaps the dot for the button. */
export function TabCloseSlot({ id, label, active, dirty, reduce, onClose }: TabCloseSlotProps) {
  return (
    <motion.span variants={CONTENT} transition={reduce ? INSTANT : FADE} className="relative grid size-5 shrink-0 place-items-center">
      {dirty ? (
        <span
          aria-label="Unsaved changes"
          role="img"
          className={cn(
            'size-2 rounded-full transition-[opacity,scale] duration-150 ease-out-expo',
            active ? 'bg-fg' : 'bg-fg-muted',
            'group-hover/tab:scale-50 group-hover/tab:opacity-0',
          )}
        />
      ) : null}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Close ${label}`}
        onMouseDown={(event) => {
          // Keep focus where it is and don't select the tab being closed.
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onClose(id);
        }}
        className={cn(
          'absolute inset-0 grid place-items-center rounded-md text-fg-subtle outline-none',
          'transition-[opacity,scale,background-color,color] duration-150 ease-out-expo hover:bg-pressed hover:text-fg',
          'group-hover/tab:pointer-events-auto group-hover/tab:scale-100 group-hover/tab:opacity-100',
          'group-focus-visible/tab:scale-100 group-focus-visible/tab:opacity-100',
          active && !dirty ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
        )}
      >
        <Icon icon={icons.CloseIcon} size={12} strokeWidth={2} />
      </button>
    </motion.span>
  );
}
