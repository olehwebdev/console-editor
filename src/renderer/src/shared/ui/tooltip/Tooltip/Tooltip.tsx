// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { cloneElement, isValidElement, useCallback, useId, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { showsContent } from './showsContent';
import { TooltipSurface } from './TooltipSurface';
import type { TooltipProps } from './types';
import { useTooltipPlacement } from './useTooltipPlacement';
import { useTooltipWarmth } from './useTooltipWarmth';
import { useTriggerEvents } from './useTriggerEvents';

/** Open delay while "cold", unless `delay` says otherwise. */
const DELAY_MS = 400;

/**
 * Hover/focus label for a control. Opens after `delay` (400 ms), instantly when
 * another tooltip was just showing; portals to <body>, never takes pointer
 * events, and closes on press, Escape, scroll and window blur. It flips away
 * from the window edge and from the native page view (see `setNativeViewRect`).
 *
 * The trigger is wrapped in a `display: contents` span, so it keeps its own
 * layout and its own handlers; the tooltip listens to bubbling events only.
 */
export function Tooltip({
  content,
  side = 'top',
  shortcut,
  children,
  delay = DELAY_MS,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  describeTrigger = true,
  className,
}: TooltipProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(false);
  const hasContent = showsContent(content) || !!shortcut?.length;
  const open = hasContent && !disabled && (controlledOpen ?? internalOpen);

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  // The portal exists only while the tooltip is open or playing its exit, so a
  // toolbar full of closed tooltips costs no extra React trees.
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  // Pinned (controlled) tooltips stay out of the warm window, or they would keep every other tooltip warm.
  useTooltipWarmth(open, controlledOpen === undefined);
  const { hide, handlers } = useTriggerEvents({ setOpen, delay, blocked: disabled || !hasContent });
  const placement = useTooltipPlacement({ open, side, wrapperRef, surfaceRef, hide });

  if (!isValidElement(children)) return children;
  if (!hasContent) return children;

  const childProps = children.props as { 'aria-describedby'?: string };
  const trigger =
    describeTrigger && open
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': [childProps['aria-describedby'], id].filter(Boolean).join(' '),
        })
      : children;

  return (
    <>
      <span ref={wrapperRef} className="contents" {...handlers}>
        {trigger}
      </span>
      {mounted
        ? createPortal(
            <AnimatePresence onExitComplete={() => setMounted(false)}>
              {open ? (
                <TooltipSurface
                  key="tooltip"
                  surfaceRef={surfaceRef}
                  id={id}
                  placement={placement}
                  side={side}
                  reduce={reduce}
                  content={content}
                  shortcut={shortcut}
                  className={className}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
