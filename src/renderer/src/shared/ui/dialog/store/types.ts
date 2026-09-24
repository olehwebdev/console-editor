import type { ReactNode } from 'react';

export type ConfirmTone = 'danger' | 'accent';

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  /** Default "Confirm" ("Delete" reads better for danger; pass it explicitly). */
  confirmLabel?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  /** `danger` for destructive actions, `accent` (default) otherwise. */
  tone?: ConfirmTone;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
}

export interface Pending extends ConfirmRequest {
  resolve: (value: boolean) => void;
}
