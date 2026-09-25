import { ANY_METHOD } from '../../../shared/overrides';
import type { RequestMatch } from '../../../shared/types';
import type { MatchedRequest } from './types';

/**
 * Whether a request is one a response override's request match takes: its method (or any), and the
 * GraphQL operation its body names (or any body). Without the request, only an override that asks
 * for nothing beyond the URL answers.
 */
export function requestMatches(match: RequestMatch | undefined, request: MatchedRequest | undefined): boolean {
  if (!match) return true;
  if (!request) return match.method === ANY_METHOD && !match.operation;
  if (match.method !== ANY_METHOD && match.method !== request.method.toUpperCase()) return false;
  return !match.operation || request.operation() === match.operation;
}
