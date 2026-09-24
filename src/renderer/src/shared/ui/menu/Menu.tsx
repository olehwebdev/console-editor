import { AnimatePresence } from 'motion/react';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { MenuPanel, RESTORES_FOCUS, type MenuAnchor, type MenuCloseReason, type MenuInitialFocus } from './MenuPanel';
import type { MenuAlign, MenuItem, MenuSide } from './types';

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

export interface MenuProps {
  items: MenuItem[];
  /**
   * The trigger: one element that accepts `ref`, `onClick`, `onKeyDown` and
   * `aria-*` props (a native button, or `Button`/`IconButton`). It receives
   * `aria-haspopup`, `aria-expanded`, `aria-controls` and `data-state`.
   */
  children: ReactElement;
  /** Horizontal alignment against the trigger. Default `start`. */
  align?: MenuAlign;
  /** Preferred side; flips when there is no room. Default `bottom`. */
  side?: MenuSide;
  /** Controlled open state (optional). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Accessible name of the menu. */
  label?: string;
  /** Extra classes for the floating panel. */
  className?: string;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * Dropdown menu anchored to its trigger. Opens on click (no highlight), on
 * Enter/Space/ArrowDown (first row highlighted) or ArrowUp (last row); arrows,
 * Home/End, typeahead, Enter to run. Esc/Tab/outside click/focus loss close it,
 * and so do window blur, resize and scrolling the trigger's container (focus
 * then returns to the trigger if the menu had it).
 */
export function Menu({
  items,
  children,
  align = 'start',
  side = 'bottom',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  label,
  className,
}: MenuProps) {
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [initialFocus, setInitialFocus] = useState<MenuInitialFocus>('none');
  const [invocation, setInvocation] = useState(0);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const show = (focus: MenuInitialFocus) => {
    setInitialFocus(focus);
    setInvocation((n) => n + 1);
    setOpen(true);
  };

  const close = useCallback(
    (reason: MenuCloseReason) => {
      setOpen(false);
      if (RESTORES_FOCUS.has(reason)) triggerRef.current?.focus({ preventScroll: true });
    },
    [setOpen],
  );

  const anchor = useMemo<MenuAnchor>(() => ({ type: 'element', element: triggerRef, align, side }), [align, side]);

  const child = isValidElement<TriggerProps>(children) ? children : null;
  const childRef = child?.props.ref;
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      setRef(childRef, node);
    },
    [childRef],
  );

  if (!child) throw new Error('<Menu> needs a single trigger element as its child');

  const triggerProps: Record<string, unknown> = {
    ref: mergedRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    'data-state': open ? 'open' : 'closed',
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      child.props.onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      triggerRef.current = event.currentTarget;
      if (open) setOpen(false);
      // A click synthesized by Enter/Space has no pointer detail.
      else show(event.detail === 0 ? 'first' : 'none');
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      child.props.onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        triggerRef.current = event.currentTarget;
        // WAI-ARIA menu button: ArrowUp opens on the last item.
        show(event.key === 'ArrowDown' ? 'first' : 'last');
      }
    },
  };

  return (
    <>
      {cloneElement(child, triggerProps)}
      {createPortal(
        <AnimatePresence>
          {open ? (
            <MenuPanel
              key={invocation}
              id={id}
              items={items}
              anchor={anchor}
              initialFocus={initialFocus}
              onClose={close}
              ignoreRef={triggerRef}
              label={label}
              className={className}
            />
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
