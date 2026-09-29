import type { Route } from 'playwright-core';
import { withTimeout } from '../../../engine/PageInterception';
import type { CapturedImage, Viewport } from '../../../shots/capture';
import { LOADED_EXPRESSION, SETTLE_EXPRESSION } from '../../../shots/constants';
import { LOAD_TIMEOUT_MS } from '../constants';
import { capturePage } from './capturePage';
import { ALL_URLS, WAIT } from './constants';
import type { PlaywrightSession } from './types';

/**
 * Captures the whole page at `url` laid out in `viewport` (size and density), once it has loaded and been quiet a
 * moment: in a context made for it (a density is a context's in Playwright), answered the same way and holding the
 * same cookies, closed afterwards.
 */
export async function capturePageAt({ browser, context }: PlaywrightSession, answer: (route: Route) => Promise<void>, url: string, { width, height, scale }: Viewport): Promise<CapturedImage> {
  const own = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, storageState: await context.storageState() });
  try {
    await own.route(ALL_URLS, answer);
    const page = await own.newPage();
    // A page still loading after that is captured as it is.
    await withTimeout(page.goto(url, { waitUntil: WAIT.loaded }).then(() => page.evaluate(LOADED_EXPRESSION)), LOAD_TIMEOUT_MS, 'Loading the page').catch(() => undefined);
    await page.evaluate(SETTLE_EXPRESSION);
    return await capturePage(page, 'page');
  } finally {
    await own.close();
  }
}
