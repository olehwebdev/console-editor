import { useStoreLog } from '@/entities/inspector';

/** Empties the Stores log (recording goes on). */
export function clearStores(): void {
  useStoreLog.getState().clear();
}
