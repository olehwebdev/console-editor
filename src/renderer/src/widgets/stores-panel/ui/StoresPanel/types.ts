import type { ConsoleFrame } from '@common/types';

/** An action's frame, and its label, by frame id. */
export type ResolveFrame = (frameId: string | null) => { frame: ConsoleFrame | undefined; label: string | undefined };
