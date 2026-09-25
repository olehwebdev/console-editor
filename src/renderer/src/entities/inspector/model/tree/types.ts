import type { ComponentTreeLevel } from '@common/types';

/** The Components tree of one frame, as far as it was opened. Levels and nodes are keyed by `pathKey`. */
export interface TreeStore {
  frameId: string | null;
  /** Levels read: null once its node was gone. Absent: not read yet. */
  levels: Record<string, ComponentTreeLevel | null>;
  expanded: Record<string, boolean>;
  /** The node shown on the Component page. */
  selected: string | null;

  /** Another frame's tree: nothing of the last one is kept. */
  setFrame(frameId: string | null): void;
  setLevel(key: string, level: ComponentTreeLevel | null): void;
  setExpanded(key: string, open: boolean): void;
  select(key: string | null): void;
}
