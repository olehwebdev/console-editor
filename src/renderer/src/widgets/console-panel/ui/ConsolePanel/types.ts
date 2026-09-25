import type { ConsoleFrame } from '@common/types';

/** What a row shows of its frame. */
export interface FrameInfo {
  /** Its `frameKey`: colour, filter and name follow it. */
  key: string;
  label: string;
  url: string;
  /** No longer on the page. */
  gone: boolean;
}

/** Keeps code you ran as an action, for the frame it ran in (undefined when it can't be told). */
export type SaveAsAction = (code: string, frame: ConsoleFrame | undefined) => void;

/** A row's frame, or null when the row can't be tied to one. */
export type ResolveFrame = (frameId: string | null) => FrameInfo | null;
