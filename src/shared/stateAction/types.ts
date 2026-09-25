import type { StateEdit } from '../types';

/** What an action that sets a component's state is written from. */
export interface StateActionInput {
  /** Find the element the component's chain was read from: one selector for its document, then one per shadow root in. */
  selector: readonly string[];
  /** The component's place in that chain (0: the one that rendered the element). */
  depth: number;
  /** The component's name, and the value's, as the Component page shows them. */
  component: string;
  label: string;
  edit: StateEdit;
}

/** An action's name and code; null when the framework's build gives the page no way to the value. */
export type StateAction = { name: string; code: string } | null;
