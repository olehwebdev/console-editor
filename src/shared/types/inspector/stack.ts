import type { StackBuild, StackLibraryId } from '../../stackLibraries';

/** A library, framework or tool a frame runs. */
export interface StackHit {
  id: StackLibraryId;
  /** How the frame showed it: one of the library's signals in `STACK_LIBRARIES`. */
  signal: string;
  /** As the page reports it, checked to look like a version; null when it doesn't say. */
  version: string | null;
  /** Null when the page doesn't tell. */
  build: StackBuild | null;
}

/** A frame's scripts loaded from files (inline ones left out) and how many name a source map, as V8 lists what it parsed. */
export interface ScriptCoverage {
  scripts: number;
  mapped: number;
  /** Some of the scripts that name none (URLs), at most a few. */
  unmapped: string[];
}

/** What one frame of the page runs, found in its main world once it loaded. */
export interface FrameStack {
  frameId: string;
  /** The frame's address when it was looked at. */
  url: string;
  /** At most one per library, in the order the detector checks them. */
  hits: StackHit[];
  /** When it was looked at (ms since the epoch). */
  scannedAt: number;
  /** Its scripts' source maps, when they could be listed. */
  coverage: ScriptCoverage | null;
}
