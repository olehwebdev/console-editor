import { useSyncExternalStore } from 'react';
import { getSnapshot } from './getSnapshot';
import { subscribe } from './subscribe';
import type { ConfirmRequest } from './types';

/** The request on screen (the head of the queue), if any. */
export function useCurrentRequest(): ConfirmRequest | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)[0];
}
