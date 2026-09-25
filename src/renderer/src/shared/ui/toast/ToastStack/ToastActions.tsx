// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ToastRecord } from '../store';
import { clickedByKeyboard } from './clickedByKeyboard';

interface ToastActionsProps {
  toast: ToastRecord;
  /** Dismisses the card once an action has run. */
  onDismiss: (viaKeyboard: boolean) => void;
}

/** The toast's quieter second action, then its main one. */
export function ToastActions({ toast: t, onDismiss }: ToastActionsProps) {
  return (
    <>
      {t.secondaryAction ? (
        <button
          type="button"
          onClick={(event) => {
            t.secondaryAction?.onClick();
            onDismiss(clickedByKeyboard(event));
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
            onDismiss(clickedByKeyboard(event));
          }}
          className="h-6 shrink-0 self-center rounded-md bg-hover px-2 text-xs font-medium text-fg transition-colors hover:bg-pressed focus-visible:outline-2 focus-visible:outline-accent/60"
        >
          {t.action.label}
        </button>
      ) : null}
    </>
  );
}
