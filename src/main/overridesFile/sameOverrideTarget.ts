import { sameMatcher } from '../../shared/matcher';
import type { CreateOverrideInput } from '../../shared/types';

type Target = Pick<CreateOverrideInput, 'kind' | 'match' | 'request'>;

/** Whether two overrides answer the same requests: kind, matcher and, for a response override, method and GraphQL operation. */
export function sameOverrideTarget(a: Target, b: Target): boolean {
  return a.kind === b.kind && !!a.match && !!b.match && sameMatcher(a.match, b.match) && a.request?.method === b.request?.method && a.request?.operation === b.request?.operation;
}
