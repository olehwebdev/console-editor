import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

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

const MAX_TOASTS = 12;

let toasts: readonly ToastRecord[] = [];
let seed = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function defaultDuration(tone: ToastTone) {
  return tone === 'danger' ? 6000 : 4000;
}

function show(options: ToastOptions): string {
  const id = options.id ?? `toast-${++seed}`;
  const tone = options.tone ?? 'neutral';
  const record: ToastRecord = {
    ...options,
    id,
    tone,
    duration: options.duration ?? defaultDuration(tone),
    version: ++seed,
  };
  const existing = toasts.some((t) => t.id === id);
  toasts = existing ? toasts.map((t) => (t.id === id ? record : t)) : [...toasts, record].slice(-MAX_TOASTS);
  emit();
  return id;
}

function dismiss(id?: string): void {
  const next = id === undefined ? [] : toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

function update(id: string, patch: Partial<Omit<ToastOptions, 'id'>>): void {
  const current = toasts.find((t) => t.id === id);
  if (!current) return;
  const tone = patch.tone ?? current.tone;
  const duration = patch.duration ?? (patch.tone && patch.tone !== current.tone ? defaultDuration(tone) : current.duration);
  toasts = toasts.map((t) => (t.id === id ? { ...current, ...patch, id, tone, duration, version: ++seed } : t));
  emit();
}

export interface ToastFn {
  /** Shows a toast and returns its id. */
  (options: ToastOptions): string;
  /** Dismisses one toast, or all of them when called without an id. */
  dismiss: (id?: string) => void;
  /** Patches a live toast in place (e.g. "Saving…" → "Saved"); restarts its timer. */
  update: (id: string, patch: Partial<Omit<ToastOptions, 'id'>>) => void;
}

/** Imperative API: `toast({ title: 'Saved', tone: 'success' })`, `toast.dismiss(id)`. Needs one `<ToastStack/>` mounted. */
export const toast: ToastFn = Object.assign(show, { dismiss, update });

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => toasts;

export function useToasts(): readonly ToastRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Only the first <ToastStack/> to register (effect order: children before parents)
// renders; the others render nothing. Mount one.
let hosts: number[] = [];
let hostSeed = 0;
const hostListeners = new Set<() => void>();

function subscribeHosts(listener: () => void) {
  hostListeners.add(listener);
  return () => {
    hostListeners.delete(listener);
  };
}

export function usePrimaryHost(): boolean {
  const [id] = useState(() => ++hostSeed);
  const primary = useSyncExternalStore(subscribeHosts, () => hosts[0] === id);
  useEffect(() => {
    hosts = [...hosts, id];
    hostListeners.forEach((l) => l());
    return () => {
      hosts = hosts.filter((h) => h !== id);
      hostListeners.forEach((l) => l());
    };
  }, [id]);
  return primary;
}
