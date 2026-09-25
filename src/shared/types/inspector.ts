import type { StackBuild, StackLibraryId } from '../stackLibraries';

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

/** What one frame of the page runs, found in its main world once it loaded. */
export interface FrameStack {
  frameId: string;
  /** The frame's address when it was looked at. */
  url: string;
  /** At most one per library, in the order the detector checks them. */
  hits: StackHit[];
  /** When it was looked at (ms since the epoch). */
  scannedAt: number;
}

/** The frameworks whose components the inspector reads. */
export const INSPECT_FRAMEWORKS = ['react', 'vue'] as const;
export type InspectFramework = (typeof INSPECT_FRAMEWORKS)[number];

/** Where a function is defined in a script as the page runs it: its URL, and 0-based line and column in the file as served. */
export interface CodeLocation {
  url: string;
  line: number;
  column: number;
}

/** A picked element, as a label. */
export interface InspectedElement {
  tag: string;
  id: string;
  classes: string[];
}

/** A value a component holds, as the page previewed it; a function also says where it is defined. */
export interface InspectedValue {
  name: string;
  preview: string;
  location: CodeLocation | null;
}

/** What kind of state a value is: a hook's (React) or where Vue keeps it. */
export const STATE_KINDS = ['state', 'store', 'ref', 'memo', 'setup', 'data', 'other'] as const;
export type StateKind = (typeof STATE_KINDS)[number];

export interface InspectedState extends InspectedValue {
  kind: StateKind;
}

/** A context the component reads (React), or a value it provides (Vue). */
export interface InspectedContext {
  name: string;
  preview: string;
  /** The component that provides it; null: the context's default value. */
  provider: string | null;
  /** Where that component is defined. */
  location: CodeLocation | null;
}

/** A listener on the picked element: the prop it came from (`onClick`) and the function it runs. */
export interface InspectedHandler {
  name: string;
  function: string;
  location: CodeLocation | null;
}

/** One component of a pick's chain: its name, its key, and where it is defined. */
export interface ComponentLink {
  name: string;
  key: string | null;
  location: CodeLocation | null;
}

/** A component of a picked element, as the page describes it: at `depth` of the chain that rendered the element. */
export interface InspectedComponent {
  pickId: string;
  /** The frame the element is in; null if it couldn't be told. */
  frameId: string | null;
  /** Null: no framework the inspector reads owns the element. */
  framework: InspectFramework | null;
  build: StackBuild | null;
  element: InspectedElement;
  /** From the component that rendered the element up to the root. */
  chain: ComponentLink[];
  depth: number;
  props: InspectedValue[];
  state: InspectedState[];
  context: InspectedContext[];
  handlers: InspectedHandler[];
}

/** What is under the pointer while picking. */
export interface InspectHover {
  element: InspectedElement;
  framework: InspectFramework | null;
  /** Component names, the one that rendered the element first. */
  chain: string[];
}
