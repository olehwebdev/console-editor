import type { ConsoleFrame } from '@common/types';
import type { FrameInfo } from '@/entities/frame';

export type { FrameInfo };

/** Keeps code you ran as an action, for the frame it ran in (undefined when it can't be told). */
export type SaveAsAction = (code: string, frame: ConsoleFrame | undefined) => void;

/** A row's frame, or null when the row can't be tied to one. */
export type ResolveFrame = (frameId: string | null) => FrameInfo | null;
