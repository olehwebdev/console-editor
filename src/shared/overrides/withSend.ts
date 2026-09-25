import type { ResponseSettings } from '../types';

/** Response settings as stored before `send` existed: the request was always sent. */
export function withSend(response: ResponseSettings): ResponseSettings {
  return response && typeof response === 'object' && response.send === undefined ? { ...response, send: true } : response;
}
