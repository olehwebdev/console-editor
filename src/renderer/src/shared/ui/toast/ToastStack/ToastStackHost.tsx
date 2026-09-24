// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence } from 'motion/react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn, useRegisterOverlay } from '@/shared/lib';
import { useToasts } from '../store';
import { stackLayout } from './stackLayout';
import { ToastCard } from './ToastCard';
import type { ToastStackProps } from './types';
import { useStackFocus } from './useStackFocus';

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

  // The toasts of the last commit, for `onExitComplete` (called by motion, outside render).
  const latest = useRef(toasts);
  useLayoutEffect(() => {
    latest.current = toasts;
  });

  const onHeight = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  const listRef = useRef<HTMLOListElement>(null);
  const { handOffFocus, onFocus, onBlur } = useStackFocus(listRef, setFocused);

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

  const { ordered, shown, frontHeight, offsets, expandedHeight } = stackLayout(toasts, heights, visibleCount);

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
