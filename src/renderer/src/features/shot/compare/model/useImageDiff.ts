import { useEffect, useState } from 'react';
import { DEFAULT_THRESHOLD } from '../lib/constants';
import DiffWorker from '../lib/diff.worker?worker';
import type { DiffRequest, DiffResponse } from '../lib/workerTypes';
import { DIFF_DEBOUNCE_MS } from './constants';
import { readForDiff } from './readForDiff';
import type { DiffSource, DiffState } from './types';

/**
 * Compares two shots pixel by pixel while `enabled` (the difference is shown): in a worker of its own, again whenever
 * either shot or the offset changes (an offset once it has rested). The difference's bitmap goes with the next one.
 */
export function useImageDiff(a: DiffSource, b: DiffSource, offset: { x: number; y: number }, enabled: boolean): DiffState {
  const [state, setState] = useState<DiffState>({ status: 'idle' });
  const { id: aId, version: aVersion, width: aWidth, height: aHeight } = a;
  const { id: bId, version: bVersion, width: bWidth, height: bHeight } = b;
  const { x, y } = offset;

  // The worker is an outside process: made for this comparison, and stopped with it.
  useEffect(() => {
    if (!enabled) return;
    let current: ImageBitmap | null = null;
    const worker = new DiffWorker();
    worker.onmessage = (event: MessageEvent<DiffResponse>) => {
      const data = event.data;
      if ('error' in data) return setState({ status: 'failed', error: data.error });
      current = data.image;
      setState({ status: 'done', image: data.image, differing: data.differing, total: data.total, regions: data.regions });
    };
    const timer = setTimeout(async () => {
      setState({ status: 'working' });
      try {
        const [first, second] = await Promise.all([readForDiff({ id: aId, version: aVersion, width: aWidth, height: aHeight }), readForDiff({ id: bId, version: bVersion, width: bWidth, height: bHeight })]);
        const request: DiffRequest = { id: 1, a: first, b: second, offset: { x, y }, threshold: DEFAULT_THRESHOLD };
        worker.postMessage(request, [first.bytes, second.bytes]);
      } catch (err) {
        setState({ status: 'failed', error: err instanceof Error ? err.message : String(err) });
      }
    }, DIFF_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      worker.terminate();
      current?.close();
    };
  }, [enabled, aId, aVersion, aWidth, aHeight, bId, bVersion, bWidth, bHeight, x, y]);

  return enabled ? state : { status: 'idle' };
}
