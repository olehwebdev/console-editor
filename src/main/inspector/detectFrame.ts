import type { StackHit } from '../../shared/types';
import type { EvaluateReply } from '../console/types';
import type { CdpTransport } from '../engine/cdp';
import { CDP } from '../engine/constants';
import { withTimeout } from '../engine/PageInterception';
import { DETECT_TIMEOUT_MS } from './constants';
import { DETECT_SOURCE } from './detectSource';
import { toStackHits } from './toStackHits';

/**
 * Runs the detector in a frame's main world, silently: no console row, and an
 * exception neither reported nor paused on. Null when the frame couldn't answer
 * (it navigated, went away or was busy).
 */
export async function detectFrame(transport: CdpTransport, uniqueContextId: string): Promise<StackHit[] | null> {
  try {
    const evaluated = transport.send<EvaluateReply>(CDP.Runtime.evaluate, { expression: DETECT_SOURCE, uniqueContextId, returnByValue: true, silent: true });
    const reply = await withTimeout(evaluated, DETECT_TIMEOUT_MS, "Looking at a frame's stack");
    return reply.exceptionDetails ? null : toStackHits(reply.result.value);
  } catch {
    return null;
  }
}
