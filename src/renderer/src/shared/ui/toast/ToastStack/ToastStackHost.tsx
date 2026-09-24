// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent as ReactFocusEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn, useRegisterOverlay } from '@/shared/lib';
import { useToasts } from '../store';
import { focusableIn } from './focusableIn';
import { focusHost } from './focusHost';
import { ToastCard } from './ToastCard';
import type { ToastStackProps } from './types';

const GAP = 8;
/** Cards shown at once when `visibleCount` isn't given. */
const VISIBLE_COUNT = 3;

export function ToastStackHost({ className, visibleCount = VISIBLE_COUNT, registerOverlay = false }: ToastStackProps) {
  const toasts = useToasts();
  // Fanned out while hovered, while focus is inside, and for the whole of a swipe.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const expanded = toasts.length > 0 && (hovered || focused || dragging);
  const [heights, setHeights] = useState<Record<string, number>>({});
  // Stays on through the last card's exit so the page view isn't unfrozen under it.
  const [lingering, setLingering] = useState(false);
  if (toasts.length > 0 && !lingering) setLingering(true);
  useRegisterOverlay(registerOverlay && (toasts.length > 0 || lingering));

  const latest = useRef(toasts);
  useLayoutEffect(() => {
    latest.current = toasts;
  });

  const onHeight = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  const listRef = useRef<HTMLOListElement>(null);
  /** Where focus was before it entered the stack; it goes back there when the stack lets go. */
  const returnFocus = useRef<HTMLElement | null>(null);

  /** Focus is leaving `card` (dismissed, or going away): to a neighbouring card, else back out. */
  const handOffFocus = useCallback((card: HTMLElement, toNeighbour: boolean) => {
    if (toNeighbour) {
      const cards = Array.from(listRef.current?.children ?? []);
      const at = cards.indexOf(card);
      const order = at < 0 ? cards : [...cards.slice(at + 1), ...cards.slice(0, at).reverse()];
      for (const other of order) {
        const target = other === card ? null : focusableIn(other);
        if (target) {
          target.focus({ preventScroll: true });
          return;
        }
      }
    }
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back && back !== document.body && back.isConnected) back.focus({ preventScroll: true });
    else if (document.activeElement instanceof HTMLElement && card.contains(document.activeElement)) document.activeElement.blur();
  }, []);

  useEffect(() => {
    const focusFront = () => {
      const list = listRef.current;
      if (!list) return false;
      let target: HTMLElement | null = null;
      for (const card of list.children) {
        target = focusableIn(card);
        if (target) break;
      }
      if (!target) return false;
      const active = document.activeElement;
      if (!list.contains(active)) returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
      target.focus({ preventScroll: true });
      return true;
    };
    focusHost.current = focusFront;
    return () => {
      if (focusHost.current === focusFront) focusHost.current = null;
    };
  }, []);

  const onExitComplete = useCallback(() => {
    const live = latest.current;
    if (live.length === 0) {
      setLingering(false);
      // The emptied stack has no box left for a pointerleave to come from.
      setHovered(false);
    }
    // A focused card that went away takes focus with it without a blur event
    // (checked a frame later, once the exited card has left the DOM).
    requestAnimationFrame(() => {
      if (!listRef.current?.contains(document.activeElement)) setFocused(false);
    });
    setHeights((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => live.some((t) => t.id === id))));
  }, []);

  // Newest first: index 0 is the front card.
  const ordered = [...toasts].reverse();
  const shown = Math.max(1, visibleCount);
  const frontHeight = ordered[0] ? (heights[ordered[0].id] ?? 0) : 0;
  const offsets: number[] = [];
  let expandedHeight = 0;
  ordered.forEach((t, index) => {
    offsets.push(expandedHeight);
    if (index < shown) expandedHeight += (heights[t.id] ?? 0) + GAP;
  });
  expandedHeight = Math.max(0, expandedHeight - GAP);

  const onFocus = (event: ReactFocusEvent<HTMLOListElement>) => {
    setFocused(true);
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return;
    if (from instanceof HTMLElement && from !== document.body) returnFocus.current = from;
  };

  const onBlur = (event: ReactFocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return createPortal(
    <ol
      ref={listRef}
      aria-label="Notifications"
      // One polite region for every tone (a per-card role="alert" inside it would be read twice).
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      data-expanded={expanded || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn('fixed bottom-4 left-4 z-[1200] w-[340px] max-w-[calc(100vw-32px)]', className)}
      style={{ height: toasts.length === 0 ? 0 : expanded ? expandedHeight : frontHeight }}
    >
      <AnimatePresence initial={false} onExitComplete={onExitComplete}>
        {ordered.map((t, index) => (
          <ToastCard
            key={t.id}
            toast={t}
            index={index}
            expanded={expanded}
            hidden={index >= shown}
            frontHeight={frontHeight}
            offset={offsets[index] ?? 0}
            maxIndex={shown - 1}
            height={heights[t.id]}
            onHeight={onHeight}
            onDragChange={setDragging}
            handOffFocus={handOffFocus}
          />
        ))}
      </AnimatePresence>
    </ol>,
    document.body,
  );
}
