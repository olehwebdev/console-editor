import { randomBytes } from 'node:crypto';
import type { GroupCapture, Shot } from '../../shared/types';
import type { BrowserCapture, Viewport } from './capture';
import { GROUP_ID_BYTES } from './constants';
import type { PageShots } from './PageShots';

/** The browsers the app drives, capturing a page in each at once. */
interface OtherBrowsers {
  captureAt(url: string, viewport: Viewport): Promise<BrowserCapture[]>;
}

/**
 * Captures the whole page in the app, then at the same address in every browser the app drives, laid out at the app's
 * viewport and density: kept as one group, the app's capture first. A browser that fails is said, not thrown.
 */
export async function captureInEveryBrowser(shots: PageShots, others: OtherBrowsers): Promise<GroupCapture> {
  const group = randomBytes(GROUP_ID_BYTES).toString('hex');
  const app = await shots.captureInGroup(group);
  const taken = await others.captureAt(app.pageUrl ?? '', { width: app.viewport?.width ?? 0, height: app.viewport?.height ?? 0, scale: app.scale });
  const kept: Shot[] = [app];
  const failed: GroupCapture['failed'] = [];
  for (const capture of taken) {
    if ('reason' in capture) failed.push(capture);
    else kept.push(await shots.keep(capture.image, capture.url, 'page', capture.browser, group));
  }
  return { group, shots: kept, failed };
}
