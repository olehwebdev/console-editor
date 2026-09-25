import { ANY_METHOD } from '../../../shared/overrides';
import type { RequestMatch } from '../../../shared/types';

/** What a GraphQL operation, and a method, add to how specific a request match is. */
const OPERATION_WEIGHT = 2;
const METHOD_WEIGHT = 1;

/**
 * How much a request match asks beyond the URL: between two overrides whose URL patterns rank the
 * same, the one naming the GraphQL operation (then the method) answers, so an override of one
 * operation of `/graphql` beats a catch-all for the rest.
 */
export function specificity(match: RequestMatch | undefined): number {
  if (!match) return 0;
  return (match.operation ? OPERATION_WEIGHT : 0) + (match.method !== ANY_METHOD ? METHOD_WEIGHT : 0);
}
