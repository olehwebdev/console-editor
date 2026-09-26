import type { InspectedComponent, StateEdit } from './component';
import type { FrameStack } from './stack';
import type { ComponentTreeLevel } from './tree';

/** The inspector's part of the API (`ConsoleEditorApi`): the page stack, picking, components, the tree and renders. */
export interface InspectorApi {
  /** What each frame of the page runs (UI library, framework, state, bundler), the top page first; empty while the console isn't recording. */
  listStacks(): Promise<FrameStack[]>;
  /** Looks at every frame again now; the result also arrives as `stack-changed`. */
  scanStacks(): Promise<void>;
  /** Puts every frame in inspect mode: hovering highlights (`inspect-hover`), a click picks (`inspect-picked`); both follow `inspect-picking`. */
  startPicking(): Promise<void>;
  stopPicking(): Promise<void>;
  /** The component at `depth` of a pick's chain (0: the one that rendered the element). */
  inspectComponent(pickId: string, depth: number): Promise<InspectedComponent>;
  /** Sets a state value of the component at `depth` of a pick's chain, and reads the component again once it rendered. */
  setComponentState(pickId: string, depth: number, edit: StateEdit): Promise<InspectedComponent>;
  /** A level of a frame's Components tree (needs the console's frames: **Record the console**); null once that node is gone. */
  componentTree(frameId: string, path: number[]): Promise<ComponentTreeLevel | null>;
  /** Picks a node of a frame's Components tree as if its first element were clicked: the component comes back as a pick. */
  openTreeNode(frameId: string, path: number[]): Promise<InspectedComponent>;
  /** Highlights a node's first element in the page; null hides the highlight. */
  highlightTreeNode(frameId: string, path: number[] | null): Promise<void>;
  /** Starts or stops recording React's commits in every frame (`renders-recorded`); needs **Record the console** and **Framework hooks**. */
  recordRenders(on: boolean): Promise<void>;
  /** Whether renders are being recorded (for a renderer that starts, or restarts, while they are). */
  isRecordingRenders(): Promise<boolean>;
  /** Starts or stops recording the actions of the page's stores in every frame (`stores-recorded`); needs **Record the console** and **Framework hooks**. */
  recordStores(on: boolean): Promise<void>;
  /** Whether store actions are being recorded. */
  isRecordingStores(): Promise<boolean>;
  /** Highlights a pick's element in the page; null hides the highlight. */
  highlightPick(pickId: string | null): Promise<void>;
}
