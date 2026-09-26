import { MAX_ACTION_NAME } from '../constants';
import type { InspectedComponent, StateEdit } from '../types';
import { STATE_ACTION_CODES } from './stateActionCodes';
import type { StateAction } from './types';

/**
 * An action that sets a value of a component's state again, as the Component page just did (its Save as
 * action; the renderer's alone, kept here so the integration tests can run it in Chromium): code that finds
 * the element the component's chain was read from (by a selector), goes up to the component and sets the
 * value, readable and editable. Null when no selector finds the element (in a closed shadow root), or the
 * page gives no way to the value (Angular's production build). `label` and `name` name the value and the
 * component as the page shows them (its original's name).
 */
export function stateAction(component: InspectedComponent, edit: StateEdit, label: string, name = component.chain[component.depth]?.name ?? 'the component'): StateAction {
  const { framework, selector, depth } = component;
  if (!framework || !selector || (framework === 'angular' && component.build !== 'development')) return null;
  // The value gets the room the name has left.
  const prefix = `Set ${label} of ${name} to `;
  const room = Math.max(1, MAX_ACTION_NAME - prefix.length);
  const value = edit.json.length > room ? `${edit.json.slice(0, room - 1)}…` : edit.json;
  return {
    name: `${prefix}${value}`.slice(0, MAX_ACTION_NAME),
    code: STATE_ACTION_CODES[framework]({ selector, depth, component: name, label, edit }),
  };
}
