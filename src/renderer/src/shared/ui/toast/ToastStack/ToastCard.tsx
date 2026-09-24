// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { KEY } from '@/shared/config';
import { CloseIcon, InfoIcon, SuccessIcon, WarningIcon } from '@/shared/config/icons';
import { cn, EASE_OUT } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { toast, type ToastRecord, type ToastTone } from '../store';
import { EXITING_ATTR } from './constants';

/** How far each card behind the front one peeks out while collapsed. */
const PEEK = 9;
const SCALE_STEP = 0.05;
const RADIUS = 12;
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 500;
const STACK_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.75 } as const;
/** With an action, a title or description longer than this (in characters) moves the actions to a row of their own. */
const LONG_TEXT = { title: 32, description: 64 } as const;

const TONE_ICON: Record<ToastTone, IconGlyph> = {
  neutral: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: AlertCircleIcon,
};

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-fg-muted',
  success: 'text-live',
  warning: 'text-warning',
  danger: 'text-danger',
};

interface ToastCardProps {
  toast: ToastRecord;
  index: number;
  expanded: boolean;
  hidden: boolean;
  frontHeight: number;
  /** Distance from the bottom of the stack when expanded. */
  offset: number;
  maxIndex: number;
  /** Natural height, once measured. */
  height: number | undefined;
  onHeight: (id: string, height: number) => void;
  onDragChange: (dragging: boolean) => void;
  handOffFocus: (card: HTMLElement, toNeighbour: boolean) => void;
}

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

  const hasFocus = () => {
    const focused = document.activeElement;
    return !!focused && !!cardRef.current?.contains(focused);
  };

  // Dismissing from inside the card hands focus on first: to the next card when
  // done from the keyboard, else back to where it was before (so the stack can collapse).
  const dismissSelf = (viaKeyboard: boolean) => {
    if (cardRef.current && hasFocus()) handOffFocus(cardRef.current, viaKeyboard);
    toast.dismiss(t.id);
  };

  // Removed by code (`toast.dismiss(id)`) while focused: don't drop focus to <body>.
  useEffect(() => {
    if (!isPresent && cardRef.current && hasFocus()) handOffFocus(cardRef.current, true);
  }, [isPresent, handOffFocus]);

  // Natural height comes from the content; the background is what gets squeezed while stacked.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => onHeight(t.id, el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [t.id, onHeight]);

  // Auto-dismiss; the clock stops while the stack is expanded (hovered or focused), and starts over when the toast is updated.
  const clock = useRef({ version: t.version, remaining: t.duration });
  useEffect(() => {
    if (clock.current.version !== t.version) clock.current = { version: t.version, remaining: t.duration };
    if (expanded || !Number.isFinite(t.duration) || t.duration <= 0) return;
    const run = clock.current;
    const started = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(t.id), Math.max(0, run.remaining));
    return () => {
      window.clearTimeout(timer);
      run.remaining -= Date.now() - started;
    };
  }, [expanded, t.id, t.version, t.duration]);

  const depth = Math.min(index, maxIndex);
  const stacked = !expanded && index > 0;
  // Transforms only. The card keeps its natural height and scales about its bottom edge;
  // behind the front card, y is chosen so the top edge peeks out PEEK px per level.
  const scale = expanded ? 1 : 1 - depth * SCALE_STEP;
  const y = expanded ? -offset : -(depth * PEEK + frontHeight * (1 - scale));

  // Stacked cards borrow the front card's height by scaling their background (not
  // animating `height`); the radius is counter-scaled so the corners stay round.
  const bgScale = useMotionValue(1);
  const bgRadius = useTransform(bgScale, (s) => `${RADIUS}px / ${RADIUS / Math.max(s, 0.05)}px`);
  const bgTarget = stacked && height && frontHeight ? frontHeight / height : 1;
  useEffect(() => {
    if (reduce) {
      bgScale.set(bgTarget);
      return;
    }
    const controls = animate(bgScale, bgTarget, STACK_SPRING);
    return () => controls.stop();
  }, [bgTarget, reduce, bgScale]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    onDragChange(false);
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      setExitX(Math.sign(info.offset.x || info.velocity.x) * 380);
      dismissSelf(false);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (event.key === KEY.escape) {
      event.stopPropagation();
      dismissSelf(true);
    }
  };

  // Enter/Space activation produces a click with no pointer detail.
  const byKeyboard = (event: ReactMouseEvent) => event.detail === 0;

  // Two actions, or one beside long text, get a row of their own so the text keeps its width.
  const long = (node: unknown, max: number) => typeof node === 'string' && node.length > max;
  const actionsBelow =
    !!t.secondaryAction || (!!t.action && (long(t.title, LONG_TEXT.title) || long(t.description, LONG_TEXT.description)));
  const actions = (
    <>
      {t.secondaryAction ? (
        <button
          type="button"
          onClick={(event) => {
            t.secondaryAction?.onClick();
            dismissSelf(byKeyboard(event));
          }}
          className="h-6 shrink-0 self-center rounded-md px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent/60"
        >
          {t.secondaryAction.label}
        </button>
      ) : null}
      {t.action ? (
        <button
          type="button"
          onClick={(event) => {
            t.action?.onClick();
            dismissSelf(byKeyboard(event));
          }}
          className="h-6 shrink-0 self-center rounded-md bg-hover px-2 text-xs font-medium text-fg transition-colors hover:bg-pressed focus-visible:outline-2 focus-visible:outline-accent/60"
        >
          {t.action.label}
        </button>
      ) : null}
    </>
  );

  return (
    <motion.li
      ref={cardRef}
      initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: hidden ? 0 : 1, y, scale }}
      exit={
        exitX
          ? { x: exitX, opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } }
          : { opacity: 0, scale: reduce ? 1 : 0.96, transition: { duration: 0.16, ease: EASE_OUT } }
      }
      transition={reduce ? { duration: 0.12 } : { default: STACK_SPRING, opacity: { duration: 0.18, ease: EASE_OUT } }}
      drag={hidden || stacked ? false : 'x'}
      dragSnapToOrigin
      onDragStart={() => onDragChange(true)}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      style={{ zIndex: 100 - index, transformOrigin: '50% 100%' }}
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
      <motion.div
        ref={contentRef}
        initial={false}
        animate={{ opacity: stacked ? 0 : 1 }}
        transition={{ duration: 0.16, ease: EASE_OUT }}
        inert={stacked || hidden}
        className="relative flex items-start gap-2.5 px-3 py-2.5"
      >
        <Icon icon={TONE_ICON[t.tone]} size={16} className={cn('mt-0.5', TONE_CLASS[t.tone])} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-fg">{t.title}</p>
          {t.description ? <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-fg-muted">{t.description}</p> : null}
          {actionsBelow ? <div className="-mr-6 mt-2 flex justify-end gap-1">{actions}</div> : null}
        </div>
        {actionsBelow ? null : actions}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(event) => dismissSelf(byKeyboard(event))}
          className={cn(
            '-mr-1 grid size-5 shrink-0 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity duration-150 hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100',
            actionsBelow ? 'self-start' : 'self-center',
          )}
        >
          <Icon icon={CloseIcon} size={14} />
        </button>
      </motion.div>
    </motion.li>
  );
});
