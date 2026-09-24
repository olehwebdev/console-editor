/** Images that can't be scaled down (ICO, SVG, GIF, WebP) are kept only up to this. */
export const MAX_KEPT = 64 * 1024;

/** The image types a favicon comes in, as data URLs name them. */
export const IMAGE_TYPE = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  webp: 'image/webp',
  svg: 'image/svg+xml',
} as const;
