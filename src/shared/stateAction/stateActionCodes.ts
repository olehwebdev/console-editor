import type { InspectFramework } from '../types';
import { angularStateAction } from './angularStateAction';
import { elementStateAction } from './elementStateAction';
import { reactStateAction } from './reactStateAction';
import type { StateActionInput } from './types';
import { vue2StateAction } from './vue2StateAction';
import { vueStateAction } from './vueStateAction';

/** How each framework's action reaches the component and sets the value: a new framework fails typecheck until it has one. */
export const STATE_ACTION_CODES: Record<InspectFramework, (input: StateActionInput) => string> = {
  react: reactStateAction,
  vue: vueStateAction,
  vue2: vue2StateAction,
  angular: angularStateAction,
  element: elementStateAction,
};
