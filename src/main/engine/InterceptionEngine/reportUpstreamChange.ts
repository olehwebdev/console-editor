import type { Override } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import { isEventStream } from './isEventStream';
import { isUpstreamOk } from './isUpstreamOk';
import { readPausedBody } from './readPausedBody';
import { sha256 } from './sha256';
import type { EngineOptions, RequestPausedParams } from './types';

/**
 * Emits `upstream-changed` when the live file an override replaces is no longer the one it was made
 * from. Only a successful response is read, and never an event stream (reading one never ends).
 */
export async function reportUpstreamChange(cdp: CdpTransport, emit: EngineOptions['emit'], p: RequestPausedParams, override: Override): Promise<void> {
  if (!override.originalHash || !isUpstreamOk(p) || isEventStream(p)) return;
  const upstream = await readPausedBody(cdp, p);
  if (upstream !== undefined && sha256(upstream) !== override.originalHash) {
    emit({ type: 'upstream-changed', overrideId: override.id, url: p.request.url });
  }
}
