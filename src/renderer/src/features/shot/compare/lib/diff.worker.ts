import { decodeAt } from './decodeAt';
import { diffPixels } from './diffPixels';
import type { DiffRequest, DiffResponse } from './workerTypes';

// Decodes both images, compares them and hands the difference back as a bitmap (transferred, not copied).
self.onmessage = async (event: MessageEvent<DiffRequest>) => {
  const { id, a, b, offset, threshold } = event.data;
  try {
    const [first, second] = await Promise.all([decodeAt(a), decodeAt(b)]);
    const { image, differing, smoothed, total, regions } = diffPixels(first, second, offset, threshold);
    const bitmap = await createImageBitmap(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height));
    (self as unknown as Worker).postMessage({ id, image: bitmap, differing, smoothed, total, regions } satisfies DiffResponse, [bitmap]);
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies DiffResponse);
  }
};
