import { toastState } from './toastState';

export function subscribe(listener: () => void) {
  toastState.listeners.add(listener);
  return () => {
    toastState.listeners.delete(listener);
  };
}
