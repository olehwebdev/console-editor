import { toastState } from './toastState';

export function subscribeHosts(listener: () => void) {
  toastState.hostListeners.add(listener);
  return () => {
    toastState.hostListeners.delete(listener);
  };
}
