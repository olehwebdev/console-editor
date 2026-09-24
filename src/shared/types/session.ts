import type { ResourceKind } from './resources';

/** A tab as remembered between runs. Its unsaved text, if any, is a separate {@link SessionDraft}. */
export interface SessionTab {
  /** Stable for the tab's lifetime, across runs; also names its draft. */
  id: string;
  url: string;
  kind: ResourceKind;
  overrideId?: string;
  originalHash: string | null;
}

/** What the active workspace reopens: on start, and when switched to. */
export interface SessionState {
  /** Last page shown ('' if none). */
  url: string;
  tabs: SessionTab[];
  activeTabId: string | null;
}

/** Unsaved edits of a tab. */
export interface SessionDraft {
  content: string;
  /** Text editing started from, for tabs not yet saved as an override (their base lives nowhere else). */
  base?: string;
}
