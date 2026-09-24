import { toastState } from './toastState';

export function emit() {
  for (const listener of toastState.listeners) listener();
}
