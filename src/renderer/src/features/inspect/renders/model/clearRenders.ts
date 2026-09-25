import { useRenderLog } from '@/entities/inspector';

/** Empties the Renders log (recording goes on). */
export function clearRenders(): void {
  useRenderLog.getState().clear();
}
