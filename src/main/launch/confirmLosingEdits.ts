import { dialog, type BrowserWindow } from 'electron';

/** The "unsaved edits could not be kept" dialog's buttons, by index. */
const FLUSH_FAILED_BUTTON = { closeAnyway: 0, cancel: 1 } as const;

/** Asks whether to close although unsaved edits could not be kept; true: close anyway. */
export function confirmLosingEdits(win: BrowserWindow): boolean {
  const choice = dialog.showMessageBoxSync(win, {
    type: 'warning',
    buttons: ['Close anyway', 'Cancel'],
    defaultId: FLUSH_FAILED_BUTTON.cancel,
    cancelId: FLUSH_FAILED_BUTTON.cancel,
    message: 'Your unsaved edits could not be kept.',
    detail: 'Close anyway and lose them?',
  });
  return choice === FLUSH_FAILED_BUTTON.closeAnyway;
}
