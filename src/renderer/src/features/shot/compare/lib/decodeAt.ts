import type { DiffImage } from './workerTypes';
import type { Pixels } from './types';

/** An image file's pixels, drawn at the size given (scaled smoothly when that isn't its own). */
export async function decodeAt({ bytes, width, height }: DiffImage): Promise<Pixels> {
  const bitmap = await createImageBitmap(new Blob([bytes]));
  try {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Can't draw the image");
    context.drawImage(bitmap, 0, 0, width, height);
    return { data: context.getImageData(0, 0, width, height).data, width, height };
  } finally {
    bitmap.close();
  }
}
