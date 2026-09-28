import type { Rect } from '../../../shared/types';
import type { CaptureTarget, LayoutMetrics } from './types';

/**
 * The part of the document to capture, in its CSS pixels (a capture's clip is the document's, not the viewport's):
 * none for the viewport, the whole page down to `maxHeight`, or an element's box moved by the scroll and kept
 * inside the page.
 */
export function clipOf(target: CaptureTarget, { cssLayoutViewport: view, cssContentSize: content }: LayoutMetrics, maxHeight: number): Rect | null {
  if (target.area === 'viewport') return null;
  if (target.area === 'page') return { x: 0, y: 0, width: Math.ceil(content.width), height: Math.min(Math.ceil(content.height), maxHeight) };
  const x = Math.max(0, target.box.x + view.pageX);
  const y = Math.max(0, target.box.y + view.pageY);
  const right = Math.min(target.box.x + view.pageX + target.box.width, content.width);
  const bottom = Math.min(target.box.y + view.pageY + target.box.height, content.height, y + maxHeight);
  if (right - x < 1 || bottom - y < 1) throw new Error("The element has no size on the page, so there's nothing to capture");
  return { x, y, width: right - x, height: bottom - y };
}
