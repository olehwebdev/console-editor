import { HEADER_OPERATIONS, type HeaderOperation } from '../types';

export function isHeaderOperation(value: unknown): value is HeaderOperation {
  return HEADER_OPERATIONS.includes(value as HeaderOperation);
}
