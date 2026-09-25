/** What a row shows of the frame that sent it. */
export interface FrameInfo {
  /** Its `frameKey`: the chip's colour follows it, as in the console. */
  key: string;
  label: string;
  url: string;
  /** No longer on the page. */
  gone: boolean;
}

/** A row's frame, or null for the top page's requests, a worker's, or a frame that isn't known. */
export type ResolveFrame = (frameId: string | undefined) => FrameInfo | null;
