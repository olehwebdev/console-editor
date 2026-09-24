// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn, DURATION, EASE_OUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';
import { isMenuSeparator } from '../isMenuSeparator';
import { createMenuBlurHandler } from './createMenuBlurHandler';
import { INITIAL_ACTIVE } from './initialActive';
import { MENU_KEY_HANDLERS } from './menuKeyHandlers';
import { MenuRow } from './MenuRow';
import { typeaheadMatch } from './typeaheadMatch';
import type { BlurCheck, MenuLive, MenuPanelProps, TypeaheadState } from './types';
import { useMenuDismiss } from './useMenuDismiss';
import { useMenuPlacement } from './useMenuPlacement';
import { useRovingFocus } from './useRovingFocus';

/** A menu scales in from its anchor, and a little way back as it closes. */
const SCALE = { enterFrom: 0.92, exitTo: 0.96 } as const;

const TYPEAHEAD_RESET_MS = 500;

/**
 * The floating list shared by `Menu` and `ContextMenu`. Mounted only while
 * visible (inside `AnimatePresence`), so it registers itself as an overlay for
 * exactly as long as it is on screen, exit animation included.
 */
export function MenuPanel({ id, items, anchor, initialFocus, onClose, ignoreRef, label, className }: MenuPanelProps) {
  useRegisterOverlay(true);
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  // Per mount, not per menu: a panel opened while the previous one is still exiting
  // must not share (and glide in from) the old panel's highlight.
  const highlightId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const typeahead = useRef<TypeaheadState>({ buffer: '', timer: 0 });
  const blurCheck = useRef<BlurCheck>({ timer: 0, pending: false });

  // Latest values for the window listeners, which are bound once.
  const live = useRef<MenuLive>({ onClose, isPresent, anchor });
  useLayoutEffect(() => {
    live.current = { onClose, isPresent, anchor };
  });

  const enabled = useMemo(
    () => items.flatMap((item, index) => (!isMenuSeparator(item) && !item.disabled ? [index] : [])),
    [items],
  );
  const [active, setActive] = useState(() => INITIAL_ACTIVE[initialFocus](enabled));
  const placement = useMenuPlacement(panelRef, anchor, items.length);
  useRovingFocus(panelRef, itemRefs, active, isPresent);
  useMenuDismiss({ panelRef, ignoreRef, live, typeahead, blurCheck });

  const choose = (index: number) => {
    const item = items[index];
    if (!item || isMenuSeparator(item) || item.disabled || !isPresent) return;
    onClose('select');
    item.onSelect();
  };

  const move = (direction: 1 | -1) => {
    if (enabled.length === 0) return;
    const at = enabled.indexOf(active);
    const next = at < 0 ? (direction === 1 ? 0 : enabled.length - 1) : (at + direction + enabled.length) % enabled.length;
    setActive(enabled[next]!);
  };

  const runTypeahead = (key: string) => {
    const ta = typeahead.current;
    window.clearTimeout(ta.timer);
    ta.buffer += key.toLocaleLowerCase();
    ta.timer = window.setTimeout(() => (ta.buffer = ''), TYPEAHEAD_RESET_MS);
    const hit = typeaheadMatch(ta.buffer, items, enabled, active);
    if (hit !== undefined) setActive(hit);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (Object.hasOwn(MENU_KEY_HANDLERS, event.key)) {
      MENU_KEY_HANDLERS[event.key](event, {
        enabled,
        setActive,
        move,
        chooseActive: () => {
          if (active >= 0) choose(active);
        },
        typing: !!typeahead.current.buffer,
        runTypeahead,
        onClose,
      });
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) runTypeahead(event.key);
  };

  const hasIcons = items.some((item) => !isMenuSeparator(item) && item.icon);
  const hasChecks = items.some((item) => !isMenuSeparator(item) && item.checked !== undefined);

  return (
    <motion.div
      ref={panelRef}
      id={id}
      role="menu"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={-1}
      inert={!isPresent}
      initial={{ opacity: 0, scale: reduce ? 1 : SCALE.enterFrom }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduce ? 1 : SCALE.exitTo, transition: { duration: DURATION.short2, ease: EASE_OUT } }}
      transition={reduce ? { duration: DURATION.short2 } : { default: SPRING_PANEL, opacity: { duration: DURATION.short4, ease: EASE_OUT } }}
      style={{
        left: placement.left,
        top: placement.top,
        transformOrigin: `${placement.originX}px ${placement.originY}px`,
      }}
      onKeyDown={onKeyDown}
      onBlur={createMenuBlurHandler({ isPresent, panelRef, ignoreRef, onClose, live, blurCheck })}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') setActive(-1);
      }}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'fixed z-[1000] min-w-[184px] max-w-[320px] overflow-y-auto overscroll-contain rounded-xl bg-surface-overlay p-1 text-[13px] text-fg shadow-overlay outline-none backdrop-blur-xl',
        'max-h-[calc(100vh-16px)] will-change-transform',
        className,
      )}
    >
      {items.map((item, index) =>
        isMenuSeparator(item) ? (
          <div key={`separator-${index}`} role="separator" className="-mx-1 my-1 h-px bg-line" />
        ) : (
          <MenuRow
            key={`${index}-${item.label}`}
            item={item}
            index={index}
            isActive={active === index}
            highlightId={highlightId}
            reduce={reduce}
            hasChecks={hasChecks}
            hasIcons={hasIcons}
            itemRefs={itemRefs}
            setActive={setActive}
            choose={choose}
          />
        ),
      )}
    </motion.div>
  );
}
