import { graphqlOperation } from '../../../shared/overrides';
import type { PausedRequest } from '../rules';
import type { MatchedRequest } from './types';

/** What response overrides match a paused request on; its body is parsed (once) only if one names an operation. */
export function matchedRequestOf(request: PausedRequest): MatchedRequest {
  let parsed = false;
  let operation: string | undefined;
  return {
    method: request.method,
    operation() {
      if (!parsed) {
        operation = graphqlOperation(request.body);
        parsed = true;
      }
      return operation;
    },
  };
}
