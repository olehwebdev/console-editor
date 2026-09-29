import type { BrowserCapture, Viewport } from '../../shots/capture';
import { shotBrowser } from './shotBrowser';
import type { Driver } from './types';

/** Captures the whole page at `url` in every driver's browser at once, laid out in `viewport`; one that fails says why. */
export function captureEvery(drivers: readonly Driver[], url: string, viewport: Viewport): Promise<BrowserCapture[]> {
  return Promise.all(
    drivers.map((driver) =>
      driver.captureAt(url, viewport).then(
        (taken) => ({ ...taken, browser: shotBrowser(driver) }),
        (err: unknown) => ({ browser: driver.browser.name, reason: err instanceof Error ? err.message : String(err) }),
      ),
    ),
  );
}
