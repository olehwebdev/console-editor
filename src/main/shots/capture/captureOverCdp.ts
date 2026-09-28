import { CDP } from '../../engine/constants';
import type { CdpTransport } from '../../engine/cdp';
import { CAPTURE_FORMAT, MAX_TEXTURE_SIDE } from '../constants';
import { readPngSize } from '../readPngSize';
import { clipOf } from './clipOf';
import { windowMetrics } from './windowMetrics';
import type { CapturedImage, CaptureTarget, LayoutMetrics } from './types';

/**
 * Captures a page over CDP, in device pixels: what its viewport shows (scrollbars included), or a part of its
 * document rendered past the viewport (`captureBeyondViewport`), which leaves the viewport and the scroll as they
 * were. Its scale is the image's pixels per CSS pixel captured; its viewport, the window's size in CSS pixels.
 */
export async function captureOverCdp(transport: CdpTransport, target: CaptureTarget): Promise<CapturedImage> {
  const [metrics, view] = await Promise.all([transport.send<LayoutMetrics>(CDP.Page.getLayoutMetrics), windowMetrics(transport)]);
  const clip = clipOf(target, metrics, Math.floor(MAX_TEXTURE_SIDE / view.ratio));
  const { data } = await transport.send<{ data: string }>(CDP.Page.captureScreenshot, {
    format: CAPTURE_FORMAT,
    ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}),
  });
  const bytes = Buffer.from(data, 'base64');
  const { width, height } = readPngSize(bytes);
  const scale = clip ? width / clip.width : view.ratio;
  return { bytes, width, height, scale, viewport: { width: view.width || Math.round(width / scale), height: view.height || Math.round(height / scale) } };
}
