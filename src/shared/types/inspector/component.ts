import type { StackBuild } from '../../stackLibraries';

/** The frameworks whose components the inspector reads; `element`: web components (custom elements). */
export const INSPECT_FRAMEWORKS = ['react', 'vue', 'vue2', 'angular', 'element'] as const;
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

/**
 * What kind of state a value is: a hook's (React: `state` is useState's, `reducer` useReducer's), where Vue keeps
 * it, an Angular signal or plain field, or a web component's state property (`state`).
 */
export const STATE_KINDS = ['state', 'reducer', 'store', 'ref', 'memo', 'setup', 'data', 'signal', 'field', 'other'] as const;
export type StateKind = (typeof STATE_KINDS)[number];

export interface InspectedState extends InspectedValue {
  kind: StateKind;
  /** It can be set from the app (`setComponentState`): a useState hook, a class's state, Vue's data or a writable ref. */
  editable: boolean;
}

/** A new value for one of a component's state values: named as `InspectedState` names it, written as JSON. */
export interface StateEdit {
  kind: StateKind;
  name: string;
  json: string;
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

/** A listener on the picked element, as the DOM has it (`DOMDebugger.getEventListeners`): the event, the function it runs and where. */
export interface InspectedListener {
  type: string;
  name: string;
  location: CodeLocation | null;
  capture: boolean;
  once: boolean;
  passive: boolean;
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
  /** Every listener on the element itself, a framework's own among them (plain JavaScript's are all there is). */
  listeners: InspectedListener[];
  /** Where it is in its frame's Components tree (indexes from the top); null if it can't be told. */
  path: number[] | null;
}

/** What is under the pointer while picking. */
export interface InspectHover {
  element: InspectedElement;
  framework: InspectFramework | null;
  /** Component names, the one that rendered the element first. */
  chain: string[];
}
