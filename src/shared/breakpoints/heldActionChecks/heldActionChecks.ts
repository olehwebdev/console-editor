import { MAX_STATUS, METHOD, MIN_STATUS } from '../../overrides/constants';
import { FAIL_REASONS, type HeldAction, type HeldActionType } from '../../types';
import { SENDABLE_URL } from '../constants';
import { bodyProblem } from './bodyProblem';
import { headersProblem } from './headersProblem';

/** How each kind of action is checked: a new kind fails typecheck until it has a check. */
export const HELD_ACTION_CHECKS: { [T in HeldActionType]: (action: Extract<HeldAction, { type: T }>) => string | null } = {
  continue: () => null,
  send: ({ url, method, headers, body }) => {
    if (typeof url !== 'string' || !SENDABLE_URL.test(url) || !URL.canParse(url)) return 'A request is sent to a web address (http or https)';
    if (typeof method !== 'string' || !METHOD.test(method)) return 'The method is a word like GET or POST';
    return headersProblem(headers) ?? bodyProblem(body, true);
  },
  respond: ({ status, headers, body }) => {
    if (!Number.isInteger(status) || status < MIN_STATUS || status > MAX_STATUS) return `The status is a number from ${MIN_STATUS} to ${MAX_STATUS}`;
    return headersProblem(headers) ?? bodyProblem(body, false);
  },
  fail: ({ reason }) => (FAIL_REASONS.includes(reason) ? null : 'Unknown network error'),
};
