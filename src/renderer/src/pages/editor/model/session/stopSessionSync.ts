import { sessionSync } from './sessionSync';

/** Stops following the tabs; what is pending stays pending until `flushSession`. */
export function stopSessionSync(): void {
  sessionSync.unsubscribe?.();
  sessionSync.unsubscribe = null;
}
