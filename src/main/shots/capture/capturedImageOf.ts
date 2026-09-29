import { readPngSize } from '../readPngSize';
import type { CapturedImage } from './types';

/**
 * A captured PNG as the app keeps it: its size, its pixels per CSS pixel (of the clip's width when it is a clip, else
 * the window's density), and the window's size (else the image's, in CSS pixels).
 */
export function capturedImageOf(bytes: Buffer, clipWidth: number | null, window: { width: number; height: number; ratio: number }): CapturedImage {
  const { width, height } = readPngSize(bytes);
  const scale = clipWidth ? width / clipWidth : window.ratio;
  return { bytes, width, height, scale, viewport: { width: window.width || Math.round(width / scale), height: window.height || Math.round(height / scale) } };
}
