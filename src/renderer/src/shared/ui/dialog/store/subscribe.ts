import { confirmState } from './confirmState';

export function subscribe(listener: () => void) {
  confirmState.listeners.add(listener);
  return () => {
    confirmState.listeners.delete(listener);
  };
}
