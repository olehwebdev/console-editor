import { readCapped } from '../readCapped';
import { BYTES_PER_MB, CONTENT_ENCODING, CONTENT_LENGTH, MS_PER_SECOND } from './constants';
import { credentialsFor } from './credentialsFor';
import { isTimeout } from './isTimeout';
import type { FetchedMap, SourceMapDeps, SourceMapLimits } from './types';
import { untilAborted } from './untilAborted';

/** Downloads a map (http(s) only, already checked) through the site's session, capped in size and time. */
export async function fetchSourceMap(url: string, bundleUrl: string, deps: SourceMapDeps, limits: SourceMapLimits): Promise<FetchedMap> {
  const signal = AbortSignal.timeout(limits.timeoutMs);
  const failed = (err: unknown): FetchedMap =>
    isTimeout(err)
      ? { failure: 'timeout', detail: String(limits.timeoutMs / MS_PER_SECOND) }
      : { failure: 'network', detail: err instanceof Error ? err.message : String(err) };
  const tooLarge: FetchedMap = { failure: 'too-large', detail: String(Math.round(limits.maxMapBytes / BYTES_PER_MB)) };
  let res: Response;
  try {
    res = await untilAborted(deps.fetch(url, { credentials: credentialsFor(url, bundleUrl, deps.pageUrl()), signal }), signal);
  } catch (err) {
    return failed(err);
  }
  const cancel = () => void res.body?.cancel().catch(() => undefined);
  if (!res.ok) {
    cancel();
    return { failure: 'http', detail: String(res.status) };
  }
  // A compressed body's length says nothing about its decoded size.
  if (!res.headers.get(CONTENT_ENCODING) && Number(res.headers.get(CONTENT_LENGTH)) > limits.maxMapBytes) {
    cancel();
    return tooLarge;
  }
  if (!res.body) return { bytes: new Uint8Array(0) };
  try {
    const bytes = await untilAborted(readCapped(res, limits.maxMapBytes), signal, cancel);
    return bytes ? { bytes } : tooLarge;
  } catch (err) {
    return failed(err);
  }
}
