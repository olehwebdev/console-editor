import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WarningIcon } from '@/shared/config/icons';
import { cn, EASE_OUT, SPRING_PANEL, SPRING_PRESS, useRegisterOverlay } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { settle, useCurrentRequest, usePrimaryHost, type ConfirmRequest } from './store';

export interface ConfirmDialogProps {
  /** Extra classes for the dialog panel. */
  className?: string;
}

/**
 * Host for `confirm()`. Mount exactly once near the root (if several are
 * mounted, only the first to register renders, so don't add one in a subtree).
 * Focus is trapped inside, Esc/backdrop cancels, Enter confirms (unless Cancel
 * has focus; held or repeated Enter is ignored), focus returns to where it was.
 * Global hotkeys registered on `window` run before the dialog sees the key, so
 * they should bail while `isConfirmOpen()` (or `useConfirmOpen()`) is true.
 */
export function ConfirmDialog({ className }: ConfirmDialogProps) {
  const primary = usePrimaryHost();
  const request = useCurrentRequest();
  if (!primary) return null;
  return createPortal(
    <AnimatePresence mode="wait">
      {request ? <DialogPanel key={request.id} request={request} className={className} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
/** Enter is ignored this long after the dialog appears, so a quick double press can't confirm unseen. */
const ENTER_GUARD_MS = 150;

function DialogPanel({ request, className }: { request: ConfirmRequest; className?: string }) {
  useRegisterOverlay(true);
  const isPresent = useIsPresent();
  const reduce = useReducedMotion() ?? false;
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [restoreTo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const { title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'accent' } = request;

  const answered = useRef(false);
  const answer = (value: boolean) => {
    if (!isPresent || answered.current) return;
    answered.current = true;
    if (restoreTo && restoreTo !== document.body && restoreTo.isConnected) restoreTo.focus({ preventScroll: true });
    settle(request.id, value);
  };
  const answerFromKey = useEffectEvent(answer);

  // Modal keyboard, captured at the window. Window-capture listeners added before this one
  // (global app hotkeys) still run first; they should bail while `isConfirmOpen()`.
  useEffect(() => {
    if (!isPresent) return;
    const openedAt = performance.now();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        answerFromKey(false);
      } else if (event.key === 'Enter') {
        if (event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        // A held Enter (e.g. the one that picked "Delete…" in a menu) must not confirm,
        // nor click the focused button natively.
        if (event.repeat || performance.now() - openedAt < ENTER_GUARD_MS) return;
        answerFromKey(document.activeElement !== cancelRef.current);
      } else if (event.key === ' ' && event.repeat) {
        // Same for a held Space: a repeat would arm the focused button and its keyup would click it.
        event.preventDefault();
      } else if (event.key === 'Tab') {
        const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (focusables.length === 0) return;
        event.preventDefault();
        const last = focusables.length - 1;
        const at = focusables.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey ? (at <= 0 ? last : at - 1) : at < 0 || at === last ? 0 : at + 1;
        focusables[next]?.focus();
      }
    };
    // Focus that escapes (a click on something behind, programmatic focus) is pulled back in.
    const onFocusIn = (event: FocusEvent) => {
      if (answered.current || !panelRef.current || panelRef.current.contains(event.target as Node)) return;
      confirmRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [isPresent]);

  return (
    <div className={cn('fixed inset-0 z-[1100] flex items-center justify-center p-4 pb-[12vh]', !isPresent && 'pointer-events-none')}>
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
        transition={{ duration: 0.16, ease: EASE_OUT }}
        onClick={() => answer(false)}
        className="absolute inset-0 bg-scrim"
      />
      <motion.div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        inert={!isPresent}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.94, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: reduce ? 1 : 0.97, transition: { duration: 0.12, ease: EASE_OUT } }}
        transition={reduce ? { duration: 0.12 } : { default: SPRING_PANEL, opacity: { duration: 0.16, ease: EASE_OUT } }}
        className={cn(
          'relative w-full max-w-[400px] rounded-2xl bg-surface-overlay p-5 text-fg shadow-overlay backdrop-blur-xl will-change-transform',
          className,
        )}
      >
        <div className="flex gap-3">
          {tone === 'danger' ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
              <Icon icon={WarningIcon} size={16} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-[15px] font-medium leading-6 text-fg">
              {title}
            </h2>
            {body ? (
              <div id={bodyId} className="mt-1 select-text text-sm leading-relaxed text-fg-muted">
                {body}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <motion.button
            ref={cancelRef}
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={SPRING_PRESS}
            onClick={() => answer(false)}
            className="h-7 rounded-lg bg-hover px-3 text-[13px] font-medium text-fg-muted transition-colors hover:bg-pressed hover:text-fg"
          >
            {cancelLabel}
          </motion.button>
          <motion.button
            ref={confirmRef}
            type="button"
            autoFocus
            whileTap={{ scale: 0.97 }}
            transition={SPRING_PRESS}
            onClick={() => answer(true)}
            className={cn(
              'h-7 rounded-lg px-3 text-[13px] font-medium transition-[filter,background-color]',
              tone === 'danger'
                ? 'bg-danger/15 text-danger ring-1 ring-danger/30 ring-inset hover:bg-danger/25'
                : 'bg-accent-grad text-accent-fg hover:brightness-110',
            )}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
