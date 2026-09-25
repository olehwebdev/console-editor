import { MAX_ACTION_CODE, MAX_ACTION_NAME } from '../../../shared/constants';
import type { ActionInput, ActionPatch } from '../../../shared/types';
import { MAX_FRAME_ADDRESS } from '../constants';

/** Checks each field and what it becomes, by field; a missing field is left out. */
const FIELDS: { [K in keyof ActionInput]: (value: unknown) => ActionInput[K] } = {
  name: (value) => {
    const name = typeof value === 'string' ? value.trim().slice(0, MAX_ACTION_NAME) : '';
    if (!name) throw new Error('An action needs a name');
    return name;
  },
  target: (value) => {
    if (typeof value !== 'string' || !value || value.length > MAX_FRAME_ADDRESS) throw new Error('An action needs a frame to run in');
    return value;
  },
  targetName: (value = '') => {
    if (typeof value !== 'string' || value.length > MAX_FRAME_ADDRESS) throw new Error('targetName must be a string');
    return value;
  },
  code: (value) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('An action needs code to run');
    if (value.length > MAX_ACTION_CODE) throw new Error('That code is too long for an action');
    return value;
  },
};

/**
 * The fields of `input` that are there, checked (names trimmed); throws, with a
 * readable message, when one isn't valid. `whole`: all of them must be there.
 */
export function actionFields(input: unknown, whole: true): ActionInput;
export function actionFields(input: unknown, whole: false): ActionPatch;
export function actionFields(input: unknown, whole: boolean): ActionPatch {
  if (!input || typeof input !== 'object') throw new Error('An action is needed');
  const given = input as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(FIELDS)) {
    if (given[key] !== undefined || whole) fields[key] = check(given[key]);
  }
  return fields as ActionPatch;
}
