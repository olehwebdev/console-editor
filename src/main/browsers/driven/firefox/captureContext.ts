import type { CaptureArea, Rect } from '../../../../shared/types';
import { BIDI, type BidiConnection } from '../../../engine/bidi';
import { captureInParts, capturedImageOf, type CapturedImage } from '../../../shots/capture';
import { METRICS_EXPRESSION } from '../constants';
import { pageMetricsOf } from '../pageMetricsOf';
import { CLIP_BOX, SCREENSHOT_ORIGIN } from './constants';
import { evaluateIn } from './evaluateIn';

/**
 * Captures a Firefox tab as a PNG in device pixels: what its viewport shows, or its whole document (down to the
 * height the app captures at most, in parts past a texture's side). Its scale is the image's pixels per CSS pixel;
 * its viewport, the window's size.
 */
export async function captureContext(connection: BidiConnection, context: string, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage> {
  const metrics = pageMetricsOf(await evaluateIn(connection, context, METRICS_EXPRESSION));
  const clip = area === 'page' ? metrics.page : null;
  const shoot = async (part: Rect | null) => {
    const params = { context, origin: SCREENSHOT_ORIGIN[area], ...(part ? { clip: { type: CLIP_BOX, ...part } } : {}) };
    return Buffer.from((await connection.send<{ data: string }>(BIDI.browsingContext.captureScreenshot, params)).data, 'base64');
  };
  return capturedImageOf(clip ? await captureInParts(clip, metrics.window.ratio, shoot) : await shoot(null), clip?.width ?? null, metrics.window);
}
