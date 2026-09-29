import { CDP } from '../../engine/constants';
import type { CdpTransport } from '../../engine/cdp';
import { SETTLE_EXPRESSION } from '../constants';
import type { Viewport } from './types';

/**
 * Runs `task` with the page's window `width` × `height` CSS pixels at `scale` device pixels per CSS pixel, then gives
 * the page its own size back. The page gets a resize, as a window would, and `task` starts once it has drawn at that
 * size and its fonts are in.
 */
export async function atViewport<T>(transport: CdpTransport, { width, height, scale }: Viewport, task: () => Promise<T>): Promise<T> {
  await transport.send(CDP.Emulation.setDeviceMetricsOverride, { width, height, deviceScaleFactor: scale, mobile: false });
  try {
    await transport.send(CDP.Runtime.evaluate, { expression: SETTLE_EXPRESSION, awaitPromise: true }).catch(() => undefined);
    return await task();
  } finally {
    await transport.send(CDP.Emulation.clearDeviceMetricsOverride).catch(() => undefined);
  }
}
