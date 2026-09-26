import { z } from 'zod';
import { MAX_ACTION_CODE, MAX_ACTION_NAME, MAX_FRAME_ADDRESS } from '../constants';
import type { ActionInput } from '../types';

/** Why each field was refused, whatever was wrong with it. */
const NEEDS_NAME = 'An action needs a name';
const NEEDS_TARGET = 'An action needs a frame to run in';
const BAD_TARGET_NAME = 'targetName must be a string';

/**
 * An action as saved: a name (trimmed, and cut to MAX_ACTION_NAME), the frame it runs in, and code
 * that isn't blank. Unknown keys are dropped.
 */
export const actionInputSchema = z.toZod<ActionInput>()(
  z.object(
    {
      name: z
        .string({ error: NEEDS_NAME })
        .trim()
        .min(1, { error: NEEDS_NAME })
        .transform((name) => name.slice(0, MAX_ACTION_NAME)),
      target: z.string({ error: NEEDS_TARGET }).min(1, { error: NEEDS_TARGET }).max(MAX_FRAME_ADDRESS, { error: NEEDS_TARGET }),
      targetName: z.string({ error: BAD_TARGET_NAME }).max(MAX_FRAME_ADDRESS, { error: BAD_TARGET_NAME }),
      code: z
        .string({ error: 'An action needs code to run' })
        .refine((code) => code.trim() !== '', { error: 'An action needs code to run' })
        .max(MAX_ACTION_CODE, { error: 'That code is too long for an action' }),
    },
    { error: 'An action is needed' },
  ),
);
