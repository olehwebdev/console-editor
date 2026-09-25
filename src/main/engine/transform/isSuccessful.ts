import { HTTP_REDIRECTION, HTTP_SUCCESSFUL } from '../constants';

/** Whether a status is a 2xx success (undefined, as for a network error, is not). */
export function isSuccessful(status: number | undefined): boolean {
  return status !== undefined && status >= HTTP_SUCCESSFUL && status < HTTP_REDIRECTION;
}
