import type { NetworkRequest, StackFrame } from '@common/types';
import { locationKey, type OriginalPlace } from '@/entities/inspector';

/**
 * The requests of a frame sent from an original file: a call of the script that sent each is in it. The
 * newest first, each with that call.
 */
export function requestsFrom(requests: readonly NetworkRequest[], file: string, frameId: string | null, origins: Record<string, OriginalPlace | null>): Array<{ request: NetworkRequest; call: StackFrame }> {
  return requests
    .flatMap((request) => {
      const call = request.initiator?.find((frame) => origins[locationKey(frame)]?.url === file);
      return call && (frameId === null || request.frameId === frameId) ? [{ request, call }] : [];
    })
    .reverse();
}
