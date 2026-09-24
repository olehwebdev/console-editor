import type { ReactNode } from 'react';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  /** The toast dismisses itself after this runs. */
  onClick: () => void;
}

export interface ToastOptions {
  /** Reuse an id to replace a toast in place (its timer restarts). */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  action?: ToastAction;
  /** A quieter second choice, shown before `action`. */
  secondaryAction?: ToastAction;
  /** Milliseconds on screen. Default 4000 (6000 for `danger`); `0` or `Infinity` stays until dismissed. */
  duration?: number;
}

export interface ToastRecord extends Omit<ToastOptions, 'id' | 'tone' | 'duration'> {
  id: string;
  tone: ToastTone;
  duration: number;
  /** Bumps on every show/update so the timer restarts. */
  version: number;
}

export interface ToastFn {
  /** Shows a toast and returns its id. */
  (options: ToastOptions): string;
  /** Dismisses one toast, or all of them when called without an id. */
  dismiss: (id?: string) => void;
  /** Patches a live toast in place (e.g. "Saving…" → "Saved"); restarts its timer. */
  update: (id: string, patch: Partial<Omit<ToastOptions, 'id'>>) => void;
}
