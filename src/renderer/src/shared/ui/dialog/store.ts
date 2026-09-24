import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

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

interface Pending extends ConfirmRequest {
  resolve: (value: boolean) => void;
}

let queue: readonly Pending[] = [];
let seed = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// Mounted <ConfirmDialog/> instances; only the first to register (effect order) renders. Mount one.
let hosts: number[] = [];

function plainText(node: ReactNode): string {
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}

/**
 * Promise-based replacement for `window.confirm`. Resolves `true` on confirm,
 * `false` on cancel / Esc / backdrop. Requests queue up if one is already open.
 * Needs one `<ConfirmDialog/>` mounted; without it, falls back to the native dialog.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (hosts.length === 0) {
    const body = plainText(options.body);
    return Promise.resolve(window.confirm(body ? `${options.title}\n\n${body}` : options.title));
  }
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { ...options, id: ++seed, resolve }];
    emit();
  });
}

/** Answers a request (no-op if it was already answered). */
export function settle(id: number, value: boolean): void {
  const request = queue.find((r) => r.id === id);
  if (!request) return;
  queue = queue.filter((r) => r !== request);
  emit();
  request.resolve(value);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => queue;

/** The request on screen (the head of the queue), if any. */
export function useCurrentRequest(): ConfirmRequest | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)[0];
}

/**
 * True while a confirm dialog is waiting for an answer. The dialog is modal, but
 * key listeners registered on `window` before it opened still run first, so
 * global hotkeys (palette, sidebar toggles…) should return early while this is true.
 */
export function isConfirmOpen(): boolean {
  return queue.length > 0;
}

const getOpen = () => queue.length > 0;

/** Reactive `isConfirmOpen()`. */
export function useConfirmOpen(): boolean {
  return useSyncExternalStore(subscribe, getOpen, getOpen);
}

let hostSeed = 0;

export function usePrimaryHost(): boolean {
  const [id] = useState(() => ++hostSeed);
  const primary = useSyncExternalStore(subscribe, () => hosts[0] === id);
  useEffect(() => {
    hosts = [...hosts, id];
    emit();
    return () => {
      hosts = hosts.filter((h) => h !== id);
      if (hosts.length === 0) {
        // Nobody left to answer: cancel whatever is pending.
        const pending = queue;
        queue = [];
        pending.forEach((r) => r.resolve(false));
      }
      emit();
    };
  }, [id]);
  return primary;
}
