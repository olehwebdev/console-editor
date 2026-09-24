// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, useReducedMotion, type PanInfo } from 'motion/react';
import { memo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { cn, DURATION, EASE_OUT } from '@/shared/lib';
import { toast } from '../store';
import { EXITING_ATTR, STACK_SPRING } from './constants';
import { containsFocus } from './containsFocus';
import { ToastBody } from './ToastBody';
import type { ToastCardProps } from './types';
import { useAutoDismiss } from './useAutoDismiss';
import { useHandOffOnRemove } from './useHandOffOnRemove';
import { useNaturalHeight } from './useNaturalHeight';
import { useSqueezedBackground } from './useSqueezedBackground';

/** How far each card behind the front one peeks out while collapsed. */
const PEEK = 9;
const SCALE_STEP = 0.05;
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 500;
/** How far (px) a swiped card flies off as it goes. */
const SWIPE_EXIT_DISTANCE = 380;
/** The front card's z-index; each card behind it sits one lower. */
const FRONT_Z = 100;
/** A card rises in from below at a little under full size, and shrinks as it's dismissed. */
const ENTER_FROM = { y: 20, scale: 0.96 } as const;
const EXIT_SCALE = 0.96;

export const ToastCard = memo(function ToastCard({
  toast: t,
  index,
  expanded,
  hidden,
  frontHeight,
  offset,
  maxIndex,
  height,
  onHeight,
  onDragChange,
  handOffFocus,
}: ToastCardProps) {
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  const cardRef = useRef<HTMLLIElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exitX, setExitX] = useState(0);

  // Dismissing from inside the card hands focus on first: to the next card when
  // done from the keyboard, else back to where it was before (so the stack can collapse).
  const dismissSelf = (viaKeyboard: boolean) => {
    if (cardRef.current && containsFocus(cardRef.current)) handOffFocus(cardRef.current, viaKeyboard);
    toast.dismiss(t.id);
  };

  useHandOffOnRemove(cardRef, isPresent, handOffFocus);
  useNaturalHeight(contentRef, t.id, onHeight);
  useAutoDismiss(t, expanded);

  const depth = Math.min(index, maxIndex);
  const stacked = !expanded && index > 0;
  // Transforms only. The card keeps its natural height and scales about its bottom edge;
  // behind the front card, y is chosen so the top edge peeks out PEEK px per level.
  const scale = expanded ? 1 : 1 - depth * SCALE_STEP;
  const y = expanded ? -offset : -(depth * PEEK + frontHeight * (1 - scale));
  const { bgScale, bgRadius } = useSqueezedBackground({ stacked, height, frontHeight, reduce });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    onDragChange(false);
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      setExitX(Math.sign(info.offset.x || info.velocity.x) * SWIPE_EXIT_DISTANCE);
      dismissSelf(false);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (event.key === KEY.escape) {
      event.stopPropagation();
      dismissSelf(true);
    }
  };

  return (
    <motion.li
      ref={cardRef}
      initial={{ opacity: 0, y: reduce ? 0 : ENTER_FROM.y, scale: reduce ? 1 : ENTER_FROM.scale }}
      animate={{ opacity: hidden ? 0 : 1, y, scale }}
      exit={
        exitX
          ? { x: exitX, opacity: 0, transition: { duration: DURATION.medium3, ease: EASE_OUT } }
          : { opacity: 0, scale: reduce ? 1 : EXIT_SCALE, transition: { duration: DURATION.medium1, ease: EASE_OUT } }
      }
      transition={reduce ? { duration: DURATION.short3 } : { default: STACK_SPRING, opacity: { duration: DURATION.medium2, ease: EASE_OUT } }}
      drag={hidden || stacked ? false : 'x'}
      dragSnapToOrigin
      onDragStart={() => onDragChange(true)}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      style={{ zIndex: FRONT_Z - index, transformOrigin: '50% 100%' }}
      // Not `inert` while exiting: that would drop focus before it can be handed on.
      {...{ [EXITING_ATTR]: !isPresent || undefined }}
      // A stacked card is only hit where its squeezed background shows (the peek).
      className={cn(
        'group absolute inset-x-0 bottom-0 will-change-transform',
        (stacked || hidden || !isPresent) && 'pointer-events-none',
      )}
    >
      <motion.div
        aria-hidden
        style={{ scaleY: bgScale, borderRadius: bgRadius, originY: 1 }}
        className={cn(
          'absolute inset-0 bg-surface-overlay shadow-overlay backdrop-blur-xl',
          stacked && !hidden && isPresent && 'pointer-events-auto',
        )}
      />
      <ToastBody toast={t} stacked={stacked} hidden={hidden} contentRef={contentRef} onDismiss={dismissSelf} />
    </motion.li>
  );
});
