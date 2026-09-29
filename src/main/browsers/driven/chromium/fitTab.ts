import type { CdpTransport } from '../../../engine/cdp';
import { CDP } from '../../../engine/constants';
import { FIT_METRICS } from '../constants';

/** Lays a Chromium tab's page out `width` CSS pixels wide (a design's), its window's height kept; null: its own width. */
export async function fitTab(transport: CdpTransport, width: number | null): Promise<void> {
  if (width === null) await transport.send(CDP.Emulation.clearDeviceMetricsOverride);
  else await transport.send(CDP.Emulation.setDeviceMetricsOverride, { width, ...FIT_METRICS });
}
