import { useSyncExternalStore } from 'react';
import { getSnapshot } from './getSnapshot';
import { subscribe } from './subscribe';
import type { ToastRecord } from './types';

export function useToasts(): readonly ToastRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
