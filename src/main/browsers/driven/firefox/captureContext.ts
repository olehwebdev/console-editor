import type { CaptureArea } from '../../../../shared/types';
import { BIDI, type BidiConnection } from '../../../engine/bidi';
import type { CapturedImage } from '../../../shots/capture';
import { MAX_TEXTURE_SIDE } from '../../../shots/constants';
import { readPngSize } from '../../../shots/readPngSize';
import { METRICS_EXPRESSION, SCREENSHOT_ORIGIN } from './constants';
import { evaluateIn } from './evaluateIn';

/**
 * Captures a Firefox tab as a PNG in device pixels: what its viewport shows, or its whole document (down to the
 * height the app captures at most). Its scale is the image's pixels per CSS pixel; its viewport, the window's size.
 */
export async function captureContext(connection: BidiConnection, context: string, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage> {
  const answer: unknown = JSON.parse((await evaluateIn(connection, context, METRICS_EXPRESSION)) ?? '[]');
  const numbers = Array.isArray(answer) && answer.length === 5 && answer.every((n) => typeof n === 'number' && n > 0) ? (answer as number[]) : [0, 0, 1, 0, 0];
  const [width, height, ratio, documentWidth, documentHeight] = numbers;
  const clip = area === 'page' && documentWidth ? { type: 'box', x: 0, y: 0, width: documentWidth, height: Math.min(documentHeight, Math.floor(MAX_TEXTURE_SIDE / ratio)) } : null;
  const { data } = await connection.send<{ data: string }>(BIDI.browsingContext.captureScreenshot, { context, origin: SCREENSHOT_ORIGIN[area], ...(clip ? { clip } : {}) });
  const bytes = Buffer.from(data, 'base64');
  const size = readPngSize(bytes);
  const scale = clip ? size.width / clip.width : ratio;
  return { bytes, ...size, scale, viewport: { width: width || Math.round(size.width / scale), height: height || Math.round(size.height / scale) } };
}
