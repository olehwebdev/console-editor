import { useEffect, useState, useSyncExternalStore } from 'react';
import { subscribeHosts } from './subscribeHosts';
import { toastState } from './toastState';

export function usePrimaryHost(): boolean {
  const [id] = useState(() => ++toastState.hostSeed);
  const primary = useSyncExternalStore(subscribeHosts, () => toastState.hosts[0] === id);
  useEffect(() => {
    toastState.hosts = [...toastState.hosts, id];
    toastState.hostListeners.forEach((l) => l());
    return () => {
      toastState.hosts = toastState.hosts.filter((h) => h !== id);
      toastState.hostListeners.forEach((l) => l());
    };
  }, [id]);
  return primary;
}
