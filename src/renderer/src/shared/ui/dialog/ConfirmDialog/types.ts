/** What the dialog's keys act on, read when the key is pressed. */
export interface DialogKeyContext {
  /** Answers the request (the panel's effect event, so only for the key listener to call). */
  answer: (value: boolean) => void;
  /** `performance.now()` when the dialog appeared. */
  openedAt: number;
  panel: HTMLDivElement | null;
  cancel: HTMLButtonElement | null;
}

export type DialogKeyHandler = (event: KeyboardEvent, dialog: DialogKeyContext) => void;
