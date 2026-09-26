import { z } from 'zod';
import type { OverridesFileEntries } from '../types';
import { MAX_IMPORTED_OVERRIDES, OVERRIDES_FILE_FORMAT, OVERRIDES_FILE_VERSION } from './constants';

/** Why a file was refused, when it isn't an export at all. */
const NOT_AN_EXPORT = "That file isn't an export of Console Editor's overrides";

/**
 * An export of overrides as read (SPEC §5, Sharing): its format, a version this build reads, and its
 * lists, each entry checked when imported (`exportedOverrideSchema`, `ruleInputSchema`). A missing list is empty.
 */
export const overridesFileSchema = z.toZod<OverridesFileEntries>()(
  z.object(
    {
      format: z.string({ error: NOT_AN_EXPORT }).refine((format): boolean => format === OVERRIDES_FILE_FORMAT, { error: NOT_AN_EXPORT }),
      version: z.number({ error: NOT_AN_EXPORT }).max(OVERRIDES_FILE_VERSION, { error: 'A newer version of Console Editor made that file: update the app to import it' }),
      overrides: z.array(z.unknown()).max(MAX_IMPORTED_OVERRIDES, { error: `That file lists over ${MAX_IMPORTED_OVERRIDES} overrides` }).default([]),
      rules: z.array(z.unknown()).default([]),
    },
    { error: NOT_AN_EXPORT },
  ),
);
