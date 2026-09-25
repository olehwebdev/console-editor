import { OPERATION_IN_QUERY } from './constants';

/**
 * The GraphQL operation a request body names: its `operationName`, else the first named operation of
 * its `query`. Undefined for any other body, and for a batch (an array of operations).
 */
export function graphqlOperation(body: string | undefined): string | undefined {
  if (!body) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const { operationName, query } = parsed as { operationName?: unknown; query?: unknown };
  if (typeof operationName === 'string' && operationName) return operationName;
  return typeof query === 'string' ? OPERATION_IN_QUERY.exec(query)?.[1] : undefined;
}
