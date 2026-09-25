import type { BreakpointStage } from '@common/types';
import type { SendInput, StageSendAction } from './types';

/** Send at each stage: the request goes out as edited, or the page gets the edited response. */
export const HELD_SEND_ACTIONS: { [S in BreakpointStage]: (input: SendInput) => StageSendAction[S] } = {
  request: ({ draft, text, edited }) => ({
    type: 'send',
    url: draft.url.trim(),
    method: draft.method.trim().toUpperCase(),
    headers: draft.headers.filter((h) => h.name.trim()),
    ...(edited ? { body: text } : {}),
  }),
  response: ({ held, draft, text, edited }) => ({
    type: 'respond',
    status: Number(draft.status),
    headers: draft.headers.filter((h) => h.name.trim()),
    body: edited ? text : (held.response?.body ?? text),
  }),
};
