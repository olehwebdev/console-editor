import type { SourceMapFailure } from '../model/store';

/** What went wrong, in words, for each failure: a new failure fails typecheck until it has some. */
const FAILURE_TEXT: Record<SourceMapFailure, (detail: string, bundle: string) => string> = {
  unreadable: (detail, bundle) => `Couldn't read ${bundle}: ${detail}`,
  'bad-url': (detail) => `The source map reference isn't a valid URL (${detail})`,
  scheme: (detail) => `The source map is at a ${detail} address, which the app never reads`,
  http: (detail) => `The source map answered HTTP ${detail} (maps often aren't published in production)`,
  network: (detail) => `The source map couldn't be downloaded: ${detail}`,
  timeout: (detail) => `The source map took longer than ${detail} s to download`,
  'too-large': (detail) => `The source map is larger than ${detail} MB`,
  'invalid-data-url': () => `The inline source map isn't a valid data: URL`,
  'not-a-map': () => 'The server answered with an HTML page, not a source map',
  invalid: (detail) => `Not a source map: ${detail}`,
  'unsupported-sections': () => `Index maps whose sections point elsewhere aren't supported`,
  worker: (detail) => `The source-map worker stopped (${detail})`,
};

/** Why a bundle's (named `bundle`) map couldn't be shown. */
export function describeFailure(failure: SourceMapFailure, detail: string, bundle: string): string {
  return FAILURE_TEXT[failure](detail, bundle);
}
