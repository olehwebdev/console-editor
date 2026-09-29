import type { Page } from 'playwright-core';
import type { CaptureArea } from '../../../../shared/types';
import { captureInParts, capturedImageOf, type CapturedImage } from '../../../shots/capture';
import { METRICS_EXPRESSION } from '../constants';
import { pageMetricsOf } from '../pageMetricsOf';

/**
 * Captures a page through Playwright as a PNG in device pixels: what its window shows, or its whole document (down to
 * the height the app captures at most, in parts past a texture's side).
 */
export async function capturePage(page: Page, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage> {
  const metrics = pageMetricsOf(await page.evaluate<string>(METRICS_EXPRESSION));
  const clip = area === 'page' ? metrics.page : null;
  const bytes = clip ? await captureInParts(clip, metrics.window.ratio, (part) => page.screenshot({ clip: part, fullPage: true })) : await page.screenshot();
  return capturedImageOf(bytes, clip?.width ?? null, metrics.window);
}
