import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { WarningIcon } from '@/shared/config/icons';
import { cn, DURATION, EASE_OUT, SPRING_PANEL, SPRING_PRESS, useRegisterOverlay } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { settle, type ConfirmRequest } from '../store';
import { DIALOG_KEY_HANDLERS } from './dialogKeyHandlers';

export function DialogPanel({ request, className }: { request: ConfirmRequest; className?: string }) {
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
      if (!Object.hasOwn(DIALOG_KEY_HANDLERS, event.key)) return;
      DIALOG_KEY_HANDLERS[event.key](event, { answer: answerFromKey, openedAt, panel: panelRef.current, cancel: cancelRef.current });
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
        exit={{ opacity: 0, scale: reduce ? 1 : 0.97, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
        transition={reduce ? { duration: DURATION.fast } : { default: SPRING_PANEL, opacity: { duration: 0.16, ease: EASE_OUT } }}
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
