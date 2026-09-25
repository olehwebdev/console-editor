import { z } from 'zod';
import { actionInputSchema } from '../../../shared/actions';
import type { ActionPatch } from '../../../shared/types';

const { name, target, targetName, code } = actionInputSchema.shape;

/** An action edit: only the fields given, each checked as a new action's. A field given as undefined is refused, not dropped. */
export const actionPatchSchema = z.object(
  { name: name.exactOptional(), target: target.exactOptional(), targetName: targetName.exactOptional(), code: code.exactOptional() },
  { error: 'An action is needed' },
) satisfies z.ZodType<ActionPatch>;
