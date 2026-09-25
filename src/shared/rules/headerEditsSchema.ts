import { z } from 'zod';
import { MAX_HEADER_EDITS } from './constants';
import { headerEditSchema } from './headerEditSchema';

/** A header rule's changes, applied in order: at least one, at most MAX_HEADER_EDITS. */
export const headerEditsSchema = z
  .array(headerEditSchema)
  .min(1, { error: 'Add at least one header change' })
  .max(MAX_HEADER_EDITS, { error: `A rule makes at most ${MAX_HEADER_EDITS} header changes` });
