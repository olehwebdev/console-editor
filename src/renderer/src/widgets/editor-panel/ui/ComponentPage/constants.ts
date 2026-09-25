import type { InspectFramework, SourceMapKind, StateKind } from '@common/types';

export const FRAMEWORK_NAME: Record<InspectFramework, string> = { react: 'React', vue: 'Vue', vue2: 'Vue 2', angular: 'Angular', element: 'Web component' };

/** What each kind of state is called; a React hook's is its kind, Vue's where it is kept, Angular's a signal or a field. */
export const STATE_KIND_LABEL: Record<StateKind, string> = {
  state: 'state',
  reducer: 'reducer',
  store: 'store',
  ref: 'ref',
  memo: 'memo',
  setup: 'setup',
  data: 'data',
  signal: 'signal',
  field: 'field',
  other: 'hook',
};

/** Where V8 places functions: in scripts. */
export const SCRIPT_KIND: SourceMapKind = 'Script';

/** What a component shows when it holds no state the inspector can list, by framework. */
export const NO_STATE: Record<InspectFramework, string> = {
  react: 'No state hooks.',
  vue: "Nothing in setupState or data: a <script setup> component's state lives inside its setup function, which the inspector can't list yet.",
  vue2: 'Nothing in data.',
  angular: 'No signals or fields of its own.',
  element: "No state properties (Lit's `state: true`).",
};

/** Whether a function's original is known: being looked up, found, or there is no map. */
export type OriginStatus = 'looking' | 'found' | 'none';

/** What the source card says of where its place came from, by status (a found one names its map). */
export const ORIGIN_NOTE: Record<Exclude<OriginStatus, 'found'>, string> = {
  looking: 'Looking for its source map…',
  none: 'Its bundle has no source map: this is the place in the file as served.',
};

/** The most of a component's renders its page lists (the newest). */
export const MAX_COMPONENT_RENDERS = 50;

/** Requests a component lists (the newest). */
export const MAX_COMPONENT_REQUESTS = 50;
