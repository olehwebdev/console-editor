import { actionInputSchema } from '../../../shared/actions';

/** A new action, or one read from the file: without a frame name, it has none. */
export const newActionSchema = actionInputSchema.extend({ targetName: actionInputSchema.shape.targetName.default('') });
