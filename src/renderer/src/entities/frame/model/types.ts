import type { ConsoleFrame } from '@common/types';

/** What a row (a console entry, a request) shows of the frame it came from. */
export interface FrameInfo {
  /** Its `frameKey`: colour, filter and name follow it. */
  key: string;
  label: string;
  url: string;
  /** No longer on the page. */
  gone: boolean;
}

/** The page's frames with their labels, and what a row shows of its frame. */
export interface FrameLookup {
  frames: ConsoleFrame[];
  /** Every frame's label, by id. */
  labels: Map<string, string>;
  /** A row's frame, including frames that have gone; null when the row has none or its frame isn't known. */
  resolve(frameId: string | null | undefined): FrameInfo | null;
}
