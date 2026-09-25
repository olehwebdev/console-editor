import type { Override, Settings } from '../../../shared/types';
import { applyHeaderEdits, type ResponseHead } from '../rules';
import { buildOverrideHeaders } from '../transform';
import { OVERRIDE_STATUS } from './constants';
import type { RequestPausedParams } from './types';

/**
 * The status and headers an override answers with, before rules: 200 with the upstream headers
 * reframed for the new body, or a response override's own status with its header changes on top.
 */
export function overrideHead(p: RequestPausedParams, override: Override, settings: Settings): ResponseHead {
  const headers = buildOverrideHeaders(p.responseHeaders, override.kind, settings);
  const response = override.response;
  if (!response) return { status: OVERRIDE_STATUS, headers };
  return { status: response.status, headers: applyHeaderEdits(headers, response.headers) };
}
