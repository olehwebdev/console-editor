import type { CodeLocation } from './component';
import type { ActionTrigger } from './stores';

/** How a component took part in a commit: mounted, rendered again, or skipped although its parent rendered (props equal). */
export const RENDER_KINDS = ['mount', 'render', 'skip'] as const;
export type RenderKind = (typeof RENDER_KINDS)[number];

/**
 * Why a component rendered again: its props, its own state (a hook, or a class's state), a store it reads
 * (useSyncExternalStore), a context it reads, its parent rendering, or its own update with nothing changed.
 */
export const RENDER_REASONS = ['props', 'state', 'store', 'context', 'parent', 'update'] as const;
export type RenderReasonKind = (typeof RENDER_REASONS)[number];

/** A value that changed, as the page previewed it before and after (a hook is named by its place, as in `InspectedState`). */
export interface RenderChange {
  name: string;
  from: string;
  to: string;
}

export interface RenderReason {
  kind: RenderReasonKind;
  changes: RenderChange[];
}

/** A component in a commit. */
export interface RenderedComponent {
  name: string;
  key: string | null;
  /** Where it is defined (for its original's name and hook names). */
  location: CodeLocation | null;
  kind: RenderKind;
  /** It is wrapped in memo (a skip then means its props were equal). */
  memo: boolean;
  /** How long its own render took (ms), its children's not included, where React measures it (development and profiling builds); else null. */
  duration: number | null;
  /** For `render`: why, at least one. */
  reasons: RenderReason[];
}

/** What started a commit: the event being handled when it was committed, if any (a click, a message from another frame). */
export interface RenderTrigger {
  type: string;
  /** The element it was dispatched to (`button#add`), `window`, or null. */
  target: string | null;
}

/** One React commit in a frame, as the hook stand-in summed it up while renders were recorded. */
export interface RenderCommit {
  /** In the order main received them, from 1. */
  id: number;
  frameId: string | null;
  /** When it was committed (ms since the epoch). */
  at: number;
  /** How long rendering took, where React measures it (development and profiling builds); else null. */
  duration: number | null;
  trigger: RenderTrigger | null;
  /** The store action React committed right after, while store actions were recorded too. */
  action: ActionTrigger | null;
  /** Those that mounted, rendered or were skipped, depth first. */
  components: RenderedComponent[];
  /** How many more than listed. */
  more: number;
}
