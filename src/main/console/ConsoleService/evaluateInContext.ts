import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { EVAL_OBJECT_GROUP } from '../constants';
import type { EvaluateReply } from '../types';

/** Runs `code` in a JavaScript context as DevTools' console does (top-level `await`, `$0`, `copy()`). */
export function evaluateInContext(transport: CdpTransport, uniqueContextId: string, code: string): Promise<EvaluateReply> {
  return transport.send<EvaluateReply>(CDP.Runtime.evaluate, {
    expression: code,
    uniqueContextId,
    objectGroup: EVAL_OBJECT_GROUP,
    replMode: true,
    includeCommandLineAPI: true,
    awaitPromise: true,
    userGesture: true,
    generatePreview: true,
  });
}
