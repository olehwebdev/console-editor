import type { IMAGE_TYPE } from './constants';

export type ImageType = (typeof IMAGE_TYPE)[keyof typeof IMAGE_TYPE];

export interface FaviconDeps {
  fetch(url: string): Promise<Response>;
  /** Scales a decodable image down to a small PNG data URL; null if it can't decode it. */
  shrink(bytes: Buffer): string | null;
}
