// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, type Transition, type Variants } from 'motion/react';
import { useRef, type DragEvent, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { icons, KEY, MOUSE_BUTTON } from '@/shared/config';
import { cn, EASE_OUT, isMac, SPRING_LAYOUT } from '@/shared/lib';
import { Icon, isGlyph } from '@/shared/ui/icon';
import { EXITING_ATTR, TAB_ID_ATTR } from './constants';
import type { DropSide, EditorTabItem, EditorTabsProps, EditorTabTone } from './types';

const TONE: Record<EditorTabTone, string> = {
  neutral: '',
  accent: 'text-accent',
  live: 'text-live',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  js: 'text-kind-js',
  css: 'text-kind-css',
  html: 'text-kind-html',
};

const INSTANT: Transition = { duration: 0 };
const WIDTH: Transition = { duration: 0.2, ease: EASE_OUT };
const FADE: Transition = { duration: 0.14, ease: EASE_OUT };

// The wrapper animates width (siblings slide); the content fades. The active
// pill sits outside the fading content so it glides at full opacity.
const WRAPPER: Variants = { hidden: { width: 0 }, shown: { width: 'auto' } };
const CONTENT: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1 } };


const TABLIST = '[role="tablist"]';

interface TabProps {
  item: EditorTabItem;
  active: boolean;
  focusable: boolean;
  pillId: string;
  reduce: boolean;
  drop: DropSide | null;
  draggable: boolean;
  renderLabel?: EditorTabsProps['renderLabel'];
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, id: string) => void;
  onReveal: (el: HTMLElement | null) => void;
  onContextMenu?: EditorTabsProps['onTabContextMenu'];
  onDoubleClick?: EditorTabsProps['onTabDoubleClick'];
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

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
  const mouseFocus = useRef(false);
  const { id, dirty = false } = item;

  // A click must never park focus on a tab: it would steal focus from the editor
  // (which the integrator may have just focused) and the next Delete meant for the
  // code would close the file. So mousedown keeps focus where it is; only when
  // focus is already in the strip (keyboard use) does it follow the click.
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    if (event.button === MOUSE_BUTTON.primary) onSelect(id);
    if (event.button === MOUSE_BUTTON.primary && draggable) {
      // Cancelling mousedown would also cancel the native drag, so let the
      // browser focus the tab and hand focus back in handleFocus.
      mouseFocus.current = true;
      window.setTimeout(() => {
        mouseFocus.current = false;
      }, 0);
      return;
    }
    event.preventDefault(); // also: no middle-click autoscroll (auxclick closes)
    if (event.button === MOUSE_BUTTON.primary && tab.closest(TABLIST)?.contains(document.activeElement)) tab.focus({ preventScroll: true });
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    const from = event.relatedTarget;
    if (mouseFocus.current) {
      mouseFocus.current = false;
      if (!(from instanceof Node && tab.closest(TABLIST)?.contains(from))) {
        // Deferred: moving focus while the button is still down cancels the drag.
        window.setTimeout(() => {
          if (document.activeElement !== tab) return;
          if (from instanceof HTMLElement && from.isConnected) from.focus({ preventScroll: true });
          else tab.blur();
        }, 0);
        return;
      }
    }
    onReveal(tab);
  };

  return (
    <motion.div
      className="flex shrink-0"
      variants={WRAPPER}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={reduce ? INSTANT : WIDTH}
      onAnimationComplete={(definition) => {
        // An entering tab only has its full scroll width once it has grown.
        if (definition === 'shown' && active) onReveal(tabRef.current);
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

        <motion.span variants={CONTENT} transition={reduce ? INSTANT : FADE} className="relative flex min-w-0 items-center gap-1.5">
          {item.icon ? (
            <span aria-hidden className={cn('grid size-4 shrink-0 place-items-center', item.tone && TONE[item.tone])}>
              {isGlyph(item.icon) ? <Icon icon={item.icon} size={14} /> : item.icon}
            </span>
          ) : null}
          <span className={cn('min-w-0 truncate', item.italic && 'italic')}>{renderLabel ? renderLabel(item, { active }) : item.label}</span>
        </motion.span>

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
            aria-label={`Close ${item.label}`}
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
      </div>
    </motion.div>
  );
}
