import type { BreakpointStage, FailReason } from '@common/types';

/** How each network error reads in the Fail menu. */
export const FAIL_REASON_LABELS: Record<FailReason, string> = {
  Failed: 'Failed',
  TimedOut: 'Timed out',
  ConnectionRefused: 'Connection refused',
  ConnectionReset: 'Connection reset',
  InternetDisconnected: 'Internet disconnected',
  NameNotResolved: 'Name not resolved',
  Aborted: 'Aborted',
};

/** What Send does, at each stage. */
export const SEND_TITLES: Record<BreakpointStage, string> = {
  request: 'Send the request with your changes (Ctrl/Cmd+S)',
  response: 'Answer the page with your version (Ctrl/Cmd+S)',
};
