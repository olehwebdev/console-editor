import { useEffect, useRef } from 'react';
import { api } from '@/shared/api';
import { HEX_DIGITS, SAMPLE_SIZE } from './constants';

/**
 * Reads the colour of a pixel of a shot's image, as `#rrggbb`. Its pixels are read (over IPC, not through its URL,
 * whose image would taint a canvas) the first time one is asked for, and let go when the page closes.
 */
export function usePixelProbe(shotId: string): (x: number, y: number) => Promise<string | null> {
  const bitmapRef = useRef<Promise<ImageBitmap | null> | null>(null);

  // Lets the decoded image go with the page (or when it shows another shot).
  useEffect(
    () => () => {
      void bitmapRef.current?.then((bitmap) => bitmap?.close());
      bitmapRef.current = null;
    },
    [shotId],
  );

  return async (x, y) => {
    bitmapRef.current ??= api
      .readShot(shotId)
      .then((bytes) => createImageBitmap(new Blob([new Uint8Array(bytes)])))
      .catch(() => null);
    const bitmap = await bitmapRef.current;
    if (!bitmap || x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return null;
    const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
    const context = canvas.getContext('2d');
    context?.drawImage(bitmap, x, y, SAMPLE_SIZE, SAMPLE_SIZE, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const data = context?.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    return data ? `#${[data[0], data[1], data[2]].map((c) => c.toString(16).padStart(HEX_DIGITS, '0')).join('')}` : null;
  };
}
