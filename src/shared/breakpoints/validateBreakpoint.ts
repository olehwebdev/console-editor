import { validateRequestMatch } from '../overrides';
import { ruleMatcherSchema } from '../rules';
import { BREAKPOINT_STAGES, MATCH_TYPES, type Breakpoint } from '../types';
import { firstIssue } from '../validation';
import { BREAKPOINT_ID } from './constants';

/** A breakpoint's problem, or null: its URL matcher as a rule's, its method as a response override's. */
export function validateBreakpoint(breakpoint: Breakpoint): string | null {
  if (!breakpoint || typeof breakpoint !== 'object') return 'A breakpoint is an id, a URL pattern, a method and a stage';
  const { id, match, method, stage, enabled } = breakpoint;
  if (typeof id !== 'string' || !BREAKPOINT_ID.test(id)) return 'A breakpoint needs an id';
  if (!BREAKPOINT_STAGES.includes(stage)) return 'A breakpoint stops a request before it is sent, or at its response';
  if (typeof enabled !== 'boolean') return 'A breakpoint is on or off';
  if (!match || !MATCH_TYPES.includes(match.type) || typeof match.pattern !== 'string' || typeof match.ignoreQuery !== 'boolean') return 'A breakpoint needs a URL pattern';
  return firstIssue(ruleMatcherSchema, match) ?? validateRequestMatch({ method, operation: '' });
}
