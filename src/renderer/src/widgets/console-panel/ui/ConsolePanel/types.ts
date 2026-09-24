/** What a row shows of its frame. */
export interface FrameInfo {
  /** Its `frameKey`: colour, filter and name follow it. */
  key: string;
  label: string;
  url: string;
  /** No longer on the page. */
  gone: boolean;
}

/** A row's frame, or null when the row can't be tied to one. */
export type ResolveFrame = (frameId: string | null) => FrameInfo | null;
