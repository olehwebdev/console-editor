import type { InspectFramework, SourceMapKind, StateKind } from '@common/types';

export const FRAMEWORK_NAME: Record<InspectFramework, string> = { react: 'React', vue: 'Vue' };

/** What each kind of state is called; a React hook's is its kind, Vue's where it is kept. */
export const STATE_KIND_LABEL: Record<StateKind, string> = { state: 'state', store: 'store', ref: 'ref', memo: 'memo', setup: 'setup', data: 'data', other: 'hook' };

/** A React hook is named by its place among the component's hooks. */
export const HOOK_PLACE = /^\d+$/;

/** Where V8 places functions: in scripts. */
export const SCRIPT_KIND: SourceMapKind = 'Script';

/** What a component shows when it holds no state the inspector can list, by framework. */
export const NO_STATE: Record<InspectFramework, string> = {
  react: 'No state hooks.',
  vue: "Nothing in setupState or data: a <script setup> component's state lives inside its setup function, which the inspector can't list yet.",
};

/** Whether a function's original is known: being looked up, found, or there is no map. */
export type OriginStatus = 'looking' | 'found' | 'none';

/** What the source card says of where its place came from, by status (a found one names its map). */
export const ORIGIN_NOTE: Record<Exclude<OriginStatus, 'found'>, string> = {
  looking: 'Looking for its source map…',
  none: 'Its bundle has no source map: this is the place in the file as served.',
};
