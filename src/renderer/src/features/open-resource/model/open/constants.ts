import type { NetworkBodyGap } from '@common/types';

/** Why a response can't be opened, by why its body can't be read. */
export const BODY_GAP_TEXT: Record<NetworkBodyGap, string> = {
  pending: "It hasn't finished arriving. Try again once it has.",
  failed: 'There was no response to open.',
  stream: 'An event stream is never read while it is open: reading it would end it for the page.',
  gone: 'The browser no longer holds this response. Reload the page and open it again.',
};
