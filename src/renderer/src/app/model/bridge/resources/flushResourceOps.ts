import { useResourceStore } from '@/entities/resource';
import { NO_FRAME } from './constants';
import { resourceQueue } from './resourceQueue';

/** Applies the queue as one store update. Whichever of the frame and the fallback timer runs first cancels the other. */
export function flushResourceOps(): void {
  cancelAnimationFrame(resourceQueue.frame);
  clearTimeout(resourceQueue.timer);
  resourceQueue.frame = NO_FRAME;
  const { ops } = resourceQueue;
  resourceQueue.ops = [];
  useResourceStore.getState().apply(ops);
}
