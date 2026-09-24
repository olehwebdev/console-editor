import { ENV } from '../../shared/constants';
import { urlArgument } from './urlArgument';

/** The URL to open on start: one on the command line, else CONSOLE_EDITOR_URL's. */
export function initialUrl(): string | undefined {
  return urlArgument(process.argv.slice(1)) ?? process.env[ENV.url];
}
