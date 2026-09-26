import { z } from 'zod';
import { urlMatcherSchema } from '../../shared/matcher';
import { headerEditSchema } from '../../shared/rules';
import { RESOURCE_KINDS, type ResourceKind } from '../../shared/types';
import { HTTP_URL } from '../constants';
import { MAX_URL_CHARS } from '../ipc/constants';
import { SHA256_HEX } from './constants';

/**
 * An override as an export file lists it. The shapes only: what a response override matches and
 * answers is checked as the store checks it (`responseFieldsOf`).
 */
export const exportedOverrideSchema = z.object({
  kind: z.custom<ResourceKind>((value) => RESOURCE_KINDS.includes(value as ResourceKind)),
  sourceUrl: z.string().max(MAX_URL_CHARS).regex(HTTP_URL),
  match: urlMatcherSchema,
  enabled: z.boolean(),
  originalHash: z.string().regex(SHA256_HEX).nullable(),
  request: z.object({ method: z.string(), operation: z.string() }).optional(),
  response: z.object({ status: z.number(), delayMs: z.number(), headers: z.array(headerEditSchema), send: z.boolean(), patch: z.boolean() }).optional(),
  content: z.string(),
  base: z.string().optional(),
});
