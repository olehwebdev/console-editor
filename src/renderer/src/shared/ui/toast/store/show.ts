import { defaultDuration } from './defaultDuration';
import { emit } from './emit';
import { toastState } from './toastState';
import type { ToastOptions, ToastRecord } from './types';

const MAX_TOASTS = 12;
/** Ids handed out to toasts shown without one. */
const ID_PREFIX = 'toast-';

export function show(options: ToastOptions): string {
  const id = options.id ?? `${ID_PREFIX}${++toastState.seed}`;
  const tone = options.tone ?? 'neutral';
  const record: ToastRecord = {
    ...options,
    id,
    tone,
    duration: options.duration ?? defaultDuration(tone),
    version: ++toastState.seed,
  };
  const { toasts } = toastState;
  const existing = toasts.some((t) => t.id === id);
  toastState.toasts = existing ? toasts.map((t) => (t.id === id ? record : t)) : [...toasts, record].slice(-MAX_TOASTS);
  emit();
  return id;
}
