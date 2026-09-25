import { headerEditSchema, MAX_HEADER_EDITS } from '../rules';
import type { ResponseSettings } from '../types';
import { firstIssue } from '../validation';
import { MAX_DELAY_MS, MAX_STATUS, MIN_STATUS } from './constants';

/** A response override's answer's problem, or null. Header changes are checked as a header rule's. */
export function validateResponseSettings(settings: ResponseSettings): string | null {
  const { status, delayMs, headers, send, patch } = settings ?? {};
  if (!Number.isInteger(status) || status < MIN_STATUS || status > MAX_STATUS) return `The status is a number from ${MIN_STATUS} to ${MAX_STATUS}`;
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > MAX_DELAY_MS) return `The delay is 0 to ${MAX_DELAY_MS} ms`;
  if (typeof send !== 'boolean') return 'Send request is on or off';
  if (typeof patch !== 'boolean') return 'Patch live is on or off';
  if (patch && !send) return 'Patch live edits the live response, so the request has to be sent';
  if (!Array.isArray(headers)) return 'Header changes are a list';
  if (headers.length > MAX_HEADER_EDITS) return `At most ${MAX_HEADER_EDITS} header changes`;
  for (const edit of headers) {
    if (!edit || typeof edit !== 'object') return 'A header change is an operation, a name and a value';
    const problem = firstIssue(headerEditSchema, edit);
    if (problem) return problem;
  }
  return null;
}
