import { AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useCurrentRequest, usePrimaryHost } from '../store';
import { DialogPanel } from './DialogPanel';

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
