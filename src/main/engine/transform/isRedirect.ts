import { HTTP_CLIENT_ERROR, HTTP_REDIRECTION } from '../constants';
import { findHeader } from './findHeader';
import type { HeaderEntry } from './types';

const LOCATION = 'location';

export function isRedirect(status: number | undefined, headers: HeaderEntry[] | undefined): boolean {
  return status !== undefined && status >= HTTP_REDIRECTION && status < HTTP_CLIENT_ERROR && !!findHeader(headers, LOCATION);
}
