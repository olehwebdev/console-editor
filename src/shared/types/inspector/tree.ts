import type { CodeLocation, InspectFramework } from './component';

/** A component of a frame's Components tree. */
export interface ComponentNode {
  framework: InspectFramework;
  name: string;
  key: string | null;
  /** Where it is defined. */
  location: CodeLocation | null;
  /** How many components are right under it. */
  children: number;
}

/** One level of a frame's Components tree: the components under the node at `path` (the top ones for an empty path). */
export interface ComponentTreeLevel {
  frameId: string;
  path: number[];
  nodes: ComponentNode[];
  /** How many more there are than listed. */
  more: number;
}
