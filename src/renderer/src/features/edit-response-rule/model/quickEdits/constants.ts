import type { ResponseRuleForm } from '../types';

/** The status an error answer uses. */
export const ERROR_STATUS = '500';

/** How long a slow answer is held back (ms), to show the page's loading state. */
export const SLOW_DELAY_MS = '3000';

/** What the answer's quick edits set in the response row. */
export const QUICK_ANSWERS: ReadonlyArray<{ label: string; change: Partial<ResponseRuleForm> }> = [
  { label: `Answer with ${ERROR_STATUS}`, change: { status: ERROR_STATUS } },
  { label: 'Answer after 3 s', change: { delay: SLOW_DELAY_MS } },
];
