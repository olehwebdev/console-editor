import { CDP } from '../../engine/constants';
import type { CdpTransport } from '../../engine/cdp';
import { SETTLE_EXPRESSION } from '../constants';
import { windowMetrics } from './windowMetrics';

/**
 * Runs `task` with the page laid out `width` CSS pixels wide at `scale` device pixels per CSS pixel (a design's), its
 * window as tall as it is, then gives the page its own size back. The page gets a resize, as a window would, and
 * `task` starts once it has drawn at that size and its fonts are in.
 */
export async function atWidth<T>(transport: CdpTransport, width: number, scale: number, task: () => Promise<T>): Promise<T> {
  const { height } = await windowMetrics(transport);
  await transport.send(CDP.Emulation.setDeviceMetricsOverride, { width, height: height || width, deviceScaleFactor: scale, mobile: false });
  try {
    await transport.send(CDP.Runtime.evaluate, { expression: SETTLE_EXPRESSION, awaitPromise: true }).catch(() => undefined);
    return await task();
  } finally {
    await transport.send(CDP.Emulation.clearDeviceMetricsOverride).catch(() => undefined);
  }
}
