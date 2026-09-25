import type { HeaderEdit, RequestMatch, ResponseSettings } from '@common/types';

/** What a response override matches besides its URL, and how it answers besides its body. */
export interface ResponseRuleValue {
  request: RequestMatch;
  response: ResponseSettings;
}

/** A response rule as its fields hold it: numbers as typed, header rows with their React keys. */
export interface ResponseRuleForm {
  method: string;
  operation: string;
  status: string;
  delay: string;
  headers: HeaderEdit[];
  /** Parallel to `headers`: stable keys for the header rows. */
  rowKeys: string[];
  /** Off: answered before it is sent (the server never sees it). */
  send: boolean;
  /** On: the live response with the edits applied, rather than the saved text. Only with `send`. */
  patch: boolean;
}
