import { defaultDuration } from './defaultDuration';
import { emit } from './emit';
import { toastState } from './toastState';
import type { ToastOptions } from './types';

export function update(id: string, patch: Partial<Omit<ToastOptions, 'id'>>): void {
  const current = toastState.toasts.find((t) => t.id === id);
  if (!current) return;
  const tone = patch.tone ?? current.tone;
  const duration = patch.duration ?? (patch.tone && patch.tone !== current.tone ? defaultDuration(tone) : current.duration);
  toastState.toasts = toastState.toasts.map((t) =>
    t.id === id ? { ...current, ...patch, id, tone, duration, version: ++toastState.seed } : t,
  );
  emit();
}
