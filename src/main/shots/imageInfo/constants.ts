/** How each image type a design can be starts: its file's first bytes. */
export const SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpg: [0xff, 0xd8, 0xff],
  /** `RIFF` … `WEBP`: the second four bytes are the file's length. */
  riff: [0x52, 0x49, 0x46, 0x46],
  webp: [0x57, 0x45, 0x42, 0x50],
} as const;

/** Where WebP's `WEBP` tag and first chunk are. */
export const WEBP = { tagAt: 8, chunkAt: 12, dataAt: 20, lossy: 'VP8 ', lossless: 'VP8L', extended: 'VP8X' } as const;

/** JPEG markers that start a frame (SOF0–SOF15, except DHT, JPG and DAC): their data holds the image's size. */
export const JPEG_FRAME_MARKERS: ReadonlySet<number> = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
