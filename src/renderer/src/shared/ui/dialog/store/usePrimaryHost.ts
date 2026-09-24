import { useEffect, useState, useSyncExternalStore } from 'react';
import { confirmState } from './confirmState';
import { emit } from './emit';
import { subscribe } from './subscribe';

export function usePrimaryHost(): boolean {
  const [id] = useState(() => ++confirmState.hostSeed);
  const primary = useSyncExternalStore(subscribe, () => confirmState.hosts[0] === id);
  useEffect(() => {
    confirmState.hosts = [...confirmState.hosts, id];
    emit();
    return () => {
      confirmState.hosts = confirmState.hosts.filter((h) => h !== id);
      if (confirmState.hosts.length === 0) {
        // Nobody left to answer: cancel whatever is pending.
        const pending = confirmState.queue;
        confirmState.queue = [];
        pending.forEach((r) => r.resolve(false));
      }
      emit();
    };
  }, [id]);
  return primary;
}
