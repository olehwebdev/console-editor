import { dialog, type BrowserWindow } from 'electron';

/** The "some edits can't be kept" dialog's buttons, by index. */
const FLUSH_FAILED_BUTTON = { closeAnyway: 0, cancel: 1 } as const;

/** Asks whether to close although unsaved edits could not be kept, or rule edits are unapplied; true: close anyway. */
export function confirmLosingEdits(win: BrowserWindow): boolean {
  const choice = dialog.showMessageBoxSync(win, {
    type: 'warning',
    buttons: ['Close anyway', 'Cancel'],
    defaultId: FLUSH_FAILED_BUTTON.cancel,
    cancelId: FLUSH_FAILED_BUTTON.cancel,
    message: 'Some of your edits can’t be kept.',
    detail: 'Unapplied rule changes, and unsaved edits that couldn’t be written, are lost if you close anyway.',
  });
  return choice === FLUSH_FAILED_BUTTON.closeAnyway;
}
