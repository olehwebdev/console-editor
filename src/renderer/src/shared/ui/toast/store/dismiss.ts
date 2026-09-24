import { emit } from './emit';
import { toastState } from './toastState';

export function dismiss(id?: string): void {
  const next = id === undefined ? [] : toastState.toasts.filter((t) => t.id !== id);
  if (next.length === toastState.toasts.length) return;
  toastState.toasts = next;
  emit();
}
