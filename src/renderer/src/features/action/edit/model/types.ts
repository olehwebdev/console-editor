import type { ActionInput, ConsoleAction } from '@common/types';

/** What the action form edits: a new action (`id` null) or one of the list, from what it opens with. */
export interface ActionEditing {
  id: string | null;
  start: ActionInput;
  /** Grows with every opening: the form is keyed by it, so each opening starts afresh. */
  session: number;
}

export interface ActionEditorStore {
  /** Null while the form is closed. */
  editing: ActionEditing | null;
  /** Opens the form for a new action, filled with `start` (a frame and code from the console). */
  startNew(start?: Partial<ActionInput>): void;
  startEdit(action: ConsoleAction): void;
  close(): void;
}
