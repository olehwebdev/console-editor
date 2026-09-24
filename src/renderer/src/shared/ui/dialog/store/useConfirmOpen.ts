import { useSyncExternalStore } from 'react';
import { isConfirmOpen } from './isConfirmOpen';
import { subscribe } from './subscribe';

/** Reactive `isConfirmOpen()`. */
export function useConfirmOpen(): boolean {
  return useSyncExternalStore(subscribe, isConfirmOpen, isConfirmOpen);
}
