import type { CodeLocation, InspectedComponent, InspectHover, StateEdit } from '@common/types';

/** Where a function of a picked component comes from: its original, through its bundle's source map. */
export interface OriginalPlace {
  bundleUrl: string;
  /** The original's URL, as the map resolves it. */
  url: string;
  /** Editor-style: 1-based. */
  line: number;
  column: number;
  /** The name the original gives the function; null if it doesn't say. */
  name: string | null;
  /** Where it is in the raw bundle, for Go to bundle code; null when not known. */
  rawOffset: number | null;
}

/** A state value set from the Component page, which it offers to keep as an action. */
export interface LastStateEdit {
  pickId: string;
  depth: number;
  edit: StateEdit;
  /** The value's name as the page showed it (a hook's name once known). */
  label: string;
}

export interface InspectorStore {
  /** The page is in inspect mode: hovering highlights, a click picks. */
  picking: boolean;
  /** What is under the pointer while picking. */
  hover: InspectHover | null;
  /** What the Component page shows: the last pick, or a component of its chain. */
  component: InspectedComponent | null;
  /** Originals of code locations, by `locationKey`: null when there is none; absent until looked up. */
  origins: Record<string, OriginalPlace | null>;
  /** A React component's hook names read off its original, by its function's `locationKey`: one per hook entry, null where unknown. */
  hookNames: Record<string, Array<string | null>>;
  /** The last value set, until another is. */
  lastEdit: LastStateEdit | null;

  setPicking(picking: boolean): void;
  setHover(hover: InspectHover | null): void;
  setComponent(component: InspectedComponent | null): void;
  setOrigin(key: string, place: OriginalPlace | null): void;
  setHookNames(key: string, names: Array<string | null>): void;
  setLastEdit(edit: LastStateEdit | null): void;
  /** Forgets the originals and hook names of every place in a bundle (its map changed). Returns the places forgotten. */
  forgetBundle(bundleUrl: string): CodeLocation[];
}
