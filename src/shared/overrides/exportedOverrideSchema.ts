import { z } from 'zod';
import { MAX_URL_CHARS } from '../constants';
import { urlMatcherSchema } from '../matcher';
import { headerEditSchema } from '../rules';
import { RESOURCE_KINDS, type ExportedOverride, type ResourceKind } from '../types';
import { SHA256_HEX, SOURCE_URL } from './constants';

/** Why an entry was refused, when it isn't one at all. */
const NOT_AN_OVERRIDE = 'Not an override';

/**
 * An override as an export lists it (SPEC §5, Sharing). The shapes only: what a response override
 * matches and answers is then checked as the store checks it (`validateRequestMatch`,
 * `validateResponseSettings`). Unknown keys are dropped.
 */
export const exportedOverrideSchema = z.toZod<ExportedOverride>()(
  z.object(
    {
      kind: z.custom<ResourceKind>((value) => RESOURCE_KINDS.includes(value as ResourceKind), { error: 'Not a kind of file the app overrides' }),
      sourceUrl: z.string().max(MAX_URL_CHARS).regex(SOURCE_URL, { error: 'An override is made from a web address (http or https)' }),
      match: urlMatcherSchema,
      enabled: z.boolean(),
      originalHash: z.string().regex(SHA256_HEX).nullable(),
      request: z.object({ method: z.string(), operation: z.string() }).optional(),
      response: z.object({ status: z.number(), delayMs: z.number(), headers: z.array(headerEditSchema), send: z.boolean(), patch: z.boolean() }).optional(),
      content: z.string(),
      base: z.string().optional(),
    },
    { error: NOT_AN_OVERRIDE },
  ),
);
