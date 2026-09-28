/** What a shot is: a capture the app made of a page, or a design the user brought in to check the page against. */
export const SHOT_KINDS = ['capture', 'design'] as const;

export type ShotKind = (typeof SHOT_KINDS)[number];

/** What a capture covers: what the viewport shows, the whole page, or one element. */
export const CAPTURE_AREAS = ['viewport', 'page', 'element'] as const;

export type CaptureArea = (typeof CAPTURE_AREAS)[number];

/** The browser a capture was taken in: the app's own page (`app`), or another the app drives. */
export interface ShotBrowser {
  id: string;
  name: string;
  version: string | null;
}

/** An image kept with a workspace: a capture of its page, or a design to compare the page with. */
export interface Shot {
  /** 8 hex chars. */
  id: string;
  kind: ShotKind;
  /** A file name, `shop.test-cart-1440-full.png`; the user can rename it. */
  name: string;
  /** Pixels in the file. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel: 2 for a capture on a 2× screen, or a design exported at 2×. */
  scale: number;
  /** The page a capture was taken of. */
  pageUrl: string | null;
  browser: ShotBrowser | null;
  /** The viewport a capture was taken at, in CSS pixels. */
  viewport: { width: number; height: number } | null;
  area: CaptureArea | null;
  /** Captures taken together, one per browser (`Capture in every browser`), share one. */
  group: string | null;
  createdAt: number;
  updatedAt: number;
}

/** What capturing in every browser did: the captures kept (one group, the app's first), and the browsers that failed. */
export interface GroupCapture {
  group: string;
  shots: Shot[];
  failed: { browser: string; reason: string }[];
}

/** What importing designs did: the ones kept, and the files that couldn't be (with why). */
export interface DesignImport {
  added: Shot[];
  failed: { name: string; reason: string }[];
}
