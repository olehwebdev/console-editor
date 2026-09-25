import type { JsonEdit } from '../../../shared/json';
import type { Override } from '../../../shared/types';

/**
 * The edits each patch-mode override makes, worked out once per version of it (the store hands out a
 * new object when an override changes): null when its texts aren't JSON. Shared by every session.
 */
export const patchEdits = new WeakMap<Override, Promise<JsonEdit[] | null>>();
