import type { FrameInfo } from '@/entities/frame';

export type { FrameInfo };

/** A row's frame, or null for the top page's requests, a worker's, or a frame that isn't known. */
export type ResolveFrame = (frameId: string | undefined) => FrameInfo | null;
