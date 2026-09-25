import type { RequestMatch } from '../types';
import { ANY_METHOD, METHOD, OPERATION_NAME } from './constants';

/** A request match's problem, or null. */
export function validateRequestMatch(match: RequestMatch): string | null {
  if (typeof match?.method !== 'string' || (match.method !== ANY_METHOD && !METHOD.test(match.method))) {
    return 'The method is a word like GET or POST, or * for any';
  }
  if (typeof match.operation !== 'string' || (match.operation !== '' && !OPERATION_NAME.test(match.operation))) {
    return 'A GraphQL operation name is letters, digits and _, not starting with a digit';
  }
  return null;
}
