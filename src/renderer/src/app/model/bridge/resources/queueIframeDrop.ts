import { queueResourceOp } from './queueResourceOp';

/** Queues dropping what a cross-site iframe reported: it navigated or went away. */
export function queueIframeDrop(iframeId: string): void {
  queueResourceOp({ type: 'drop-iframe', iframeId });
}
