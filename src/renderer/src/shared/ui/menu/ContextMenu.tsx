// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence } from 'motion/react';
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { KEY, MOUSE_BUTTON } from '@/shared/config';
import { cn } from '@/shared/lib';
import { MenuPanel, RESTORES_FOCUS, type MenuAnchor, type MenuCloseReason } from './MenuPanel';
import type { MenuItem } from './types';

export interface ContextMenuProps {
  items: MenuItem[];
  /** The region that answers right-click (and Shift+F10 / the Menu key on a focused descendant). */
  children: ReactNode;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the menu. */
  label?: string;
  /** Classes for the wrapper; it is `display: contents` by default, so it adds no box. */
  className?: string;
  /** Extra classes for the floating panel. */
  menuClassName?: string;
}

/** A keyboard-opened menu sits under its target, this far in from the left edge (at most half its width), in px. */
const KEYBOARD_INSET = 16;

interface Invocation {
  key: number;
  anchor: MenuAnchor;
  modality: 'pointer' | 'keyboard';
  /** Focus goes back here on Esc / select. */
  restore: HTMLElement | null;
}

/**
 * Right-click menu for everything inside it, scaling in from the pointer.
 * Nested context menus work: the innermost one handles the event and the
 * outer ones see it as already handled (`defaultPrevented`).
 */
export function ContextMenu({ items, children, disabled = false, onOpenChange, label, className, menuClassName }: ContextMenuProps) {
  const id = useId();
  const [invocation, setInvocation] = useState<Invocation | null>(null);
  const current = useRef<Invocation | null>(null);
  const seed = useRef(0);

  const openAt = (x: number, y: number, modality: Invocation['modality'], within: EventTarget) => {
    const focused = document.activeElement;
    const next: Invocation = {
      key: ++seed.current,
      anchor: { type: 'point', x, y, within: within instanceof Element ? within : null },
      modality,
      restore: focused instanceof HTMLElement && focused !== document.body ? focused : null,
    };
    current.current = next;
    setInvocation(next);
    onOpenChange?.(true);
  };

  const close = useCallback(
    (key: number, reason: MenuCloseReason) => {
      const inv = current.current;
      // A panel still playing its exit must not close the one that replaced it.
      if (!inv || inv.key !== key) return;
      current.current = null;
      setInvocation(null);
      onOpenChange?.(false);
      if (RESTORES_FOCUS.has(reason) && inv.restore?.isConnected) {
        inv.restore.focus({ preventScroll: true });
      }
    },
    [onOpenChange],
  );

  // React bubbles portal events through the tree; only events from the wrapped DOM count.
  const handles = (event: { defaultPrevented: boolean; currentTarget: HTMLElement; target: EventTarget }) =>
    !event.defaultPrevented && !disabled && items.length > 0 && event.currentTarget.contains(event.target as Node);

  const onContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!handles(event)) return;
    event.preventDefault();
    // Keyboard-generated contextmenu events carry no pointer position.
    if (event.button !== MOUSE_BUTTON.secondary && event.clientX === 0 && event.clientY === 0) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      openAt(rect.left + Math.min(KEYBOARD_INSET, rect.width / 2), rect.bottom, 'keyboard', event.target);
      return;
    }
    openAt(event.clientX, event.clientY, 'pointer', event.target);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!handles(event)) return;
    if (event.key !== KEY.contextMenu && !(event.shiftKey && event.key === KEY.f10)) return;
    event.preventDefault();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    openAt(rect.left + Math.min(KEYBOARD_INSET, rect.width / 2), rect.bottom, 'keyboard', event.target);
  };

  const panel = useMemo(() => {
    if (!invocation) return null;
    const { key, anchor, modality } = invocation;
    return (
      <MenuPanel
        key={key}
        id={id}
        items={items}
        anchor={anchor}
        initialFocus={modality === 'keyboard' ? 'first' : 'none'}
        onClose={(reason) => close(key, reason)}
        label={label}
        className={menuClassName}
      />
    );
  }, [invocation, id, items, close, label, menuClassName]);

  return (
    <div className={cn('contents', className)} onContextMenu={onContextMenu} onKeyDown={onKeyDown}>
      {children}
      {createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  );
}
