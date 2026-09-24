import { HTTP_URL } from '../constants';

/** First http(s) URL among command-line arguments, e.g. `npm start -- https://example.com`. */
export function urlArgument(args: string[]): string | undefined {
  return args.find((arg) => HTTP_URL.test(arg));
}
