import type { CdpTransport } from '../../engine/cdp';
import { atViewport } from './atViewport';
import { windowMetrics } from './windowMetrics';

/**
 * Runs `task` with the page laid out `width` CSS pixels wide at `scale` device pixels per CSS pixel (a design's), its
 * window as tall as it is (see {@link atViewport}).
 */
export async function atWidth<T>(transport: CdpTransport, width: number, scale: number, task: () => Promise<T>): Promise<T> {
  const { height } = await windowMetrics(transport);
  return atViewport(transport, { width, height: height || width, scale }, task);
}
