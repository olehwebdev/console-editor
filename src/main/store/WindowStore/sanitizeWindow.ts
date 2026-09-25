import type { SavedWindow } from './types';

/** The keys of a window's saved bounds, each a whole number. */
const BOUNDS_KEYS = ['x', 'y', 'width', 'height'] as const;

/** Keeps only a well-formed saved state, so a corrupt or old file can't place the window anywhere odd. */
export function sanitizeWindow(input: unknown): SavedWindow {
  const raw = (input ?? {}) as Partial<Record<keyof SavedWindow, unknown>>;
  const bounds = raw.bounds as Partial<Record<(typeof BOUNDS_KEYS)[number], unknown>> | undefined;
  const validBounds = !!bounds && BOUNDS_KEYS.every((key) => Number.isInteger(bounds[key])) && (bounds.width as number) > 0 && (bounds.height as number) > 0;
  return {
    detached: raw.detached === true,
    ...(validBounds ? { bounds: { x: bounds.x as number, y: bounds.y as number, width: bounds.width as number, height: bounds.height as number } } : {}),
    ...(raw.maximized === true ? { maximized: true } : {}),
    ...(raw.onTop === true ? { onTop: true } : {}),
  };
}
