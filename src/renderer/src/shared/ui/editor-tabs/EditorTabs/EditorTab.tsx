// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, type Transition, type Variants } from 'motion/react';
import { useRef } from 'react';
import { KEY, MOUSE_BUTTON } from '@/shared/config';
import { cn, DURATION, EASE_OUT, isMac, SPRING_LAYOUT } from '@/shared/lib';
import { EXITING_ATTR, INSTANT, TAB_ID_ATTR, VARIANT } from './constants';
import { TabCloseSlot } from './TabCloseSlot';
import { TabLabel } from './TabLabel';
import type { TabProps } from './types';
import { useTabMouseFocus } from './useTabMouseFocus';

const WIDTH: Transition = { duration: DURATION.medium3, ease: EASE_OUT };
/** The wrapper animates width, so its siblings slide (see `VARIANT`). */
const WRAPPER: Variants = { [VARIANT.hidden]: { width: 0 }, [VARIANT.shown]: { width: 'auto' } };

export function EditorTab({
  item,
  active,
  focusable,
  pillId,
  reduce,
  drop,
  draggable,
  renderLabel,
  onSelect,
  onClose,
  onKeyDown,
  onReveal,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TabProps) {
  const present = useIsPresent();
  const tabRef = useRef<HTMLDivElement>(null);
  const { id, dirty = false } = item;
  const { handleMouseDown, handleFocus } = useTabMouseFocus({ id, draggable, onSelect, onReveal });

  return (
    <motion.div
      className="flex shrink-0"
      variants={WRAPPER}
      initial={VARIANT.hidden}
      animate={VARIANT.shown}
      exit={VARIANT.hidden}
      transition={reduce ? INSTANT : WIDTH}
      onAnimationComplete={(definition) => {
        // An entering tab only has its full scroll width once it has grown.
        if (definition === VARIANT.shown && active) onReveal(tabRef.current);
      }}
    >
      <div
        ref={tabRef}
        role="tab"
        aria-selected={active}
        aria-hidden={!present || undefined}
        aria-keyshortcuts={isMac ? `${KEY.delete} ${KEY.backspace}` : KEY.delete}
        tabIndex={present && focusable ? 0 : -1}
        title={item.title}
        {...{ [TAB_ID_ATTR]: id }}
        data-active={active || undefined}
        data-dirty={dirty || undefined}
        {...{ [EXITING_ATTR]: !present || undefined }}
        draggable={draggable && present}
        onMouseDown={handleMouseDown}
        onAuxClick={(event) => {
          if (event.button !== MOUSE_BUTTON.middle) return;
          event.preventDefault();
          onClose(id);
        }}
        onKeyDown={(event) => onKeyDown(event, id)}
        onFocus={handleFocus}
        onContextMenu={onContextMenu ? (event) => onContextMenu(id, event) : undefined}
        onDoubleClick={onDoubleClick ? () => onDoubleClick(id) : undefined}
        onDragStart={(event) => onDragStart(event, id)}
        onDragOver={(event) => onDragOver(event, id)}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={cn(
          'group/tab relative mr-0.5 flex h-7 max-w-[240px] shrink-0 cursor-default select-none items-center gap-1.5 rounded-lg pl-2.5 pr-1 text-[13px] outline-none',
          'transition-colors duration-150 ease-out-expo',
          'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60',
          active ? 'text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
          !present && 'pointer-events-none',
        )}
      >
        {active ? (
          <motion.span
            layoutId={pillId}
            aria-hidden
            className="absolute inset-0 rounded-lg bg-surface-raised shadow-raised"
            style={{ borderRadius: 8 }}
            transition={reduce ? INSTANT : SPRING_LAYOUT}
          />
        ) : null}

        {drop ? (
          <span
            aria-hidden
            className={cn('pointer-events-none absolute inset-y-1 z-10 w-0.5 rounded-full bg-accent', drop === 'before' ? '-left-[3px]' : '-right-[3px]')}
          />
        ) : null}

        <TabLabel item={item} active={active} reduce={reduce} renderLabel={renderLabel} />
        <TabCloseSlot id={id} label={item.label} active={active} dirty={dirty} reduce={reduce} onClose={onClose} />
      </div>
    </motion.div>
  );
}
