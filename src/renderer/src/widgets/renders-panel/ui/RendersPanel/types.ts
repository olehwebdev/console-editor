import type { ConsoleFrame, RenderCommit } from '@common/types';

/** A commit's frame, and its label, by frame id. */
export type ResolveFrame = (frameId: string | null) => { frame: ConsoleFrame | undefined; label: string | undefined };

/** The rows of a commit in the Renders log: its heading, a row per component listed, then the count of the rest. */
export type LogRowKind = 'heading' | 'component' | 'more';

/** The Renders log as rows: where each commit's rows start (its heading's row), and how many rows there are. */
export interface LogLayout {
  starts: number[];
  count: number;
}

/** A row of the Renders log: its commit, and which of the commit's rows it is (0 is its heading). */
export interface LogRowProps {
  commit: RenderCommit;
  offset: number;
  resolve: ResolveFrame;
}
