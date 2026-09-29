import { useCallback } from 'react';

export interface DiffCanvasProps {
  image: ImageBitmap;
  zoom: number;
}

/** The difference's bitmap, drawn once per bitmap, shown at the zoom (square pixels when enlarged). */
export function DiffCanvas({ image, zoom }: DiffCanvasProps) {
  // Draws the bitmap as the canvas comes (a new bitmap gets a new canvas, by key).
  const draw = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvas?.getContext('2d')?.drawImage(image, 0, 0);
    },
    [image],
  );
  return (
    <canvas
      ref={draw}
      width={image.width}
      height={image.height}
      style={{ width: image.width * zoom, height: image.height * zoom, imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
      className="block"
      data-testid="compare-diff-canvas"
    />
  );
}
