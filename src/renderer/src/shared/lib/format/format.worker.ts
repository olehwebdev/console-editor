import beautify from 'js-beautify';
import type { ResourceKind } from '@common/types';

export interface FormatRequest {
  id: number;
  kind: ResourceKind;
  text: string;
}

export type FormatResponse = { id: number; text: string } | { id: number; error: string };

const options = { indent_size: 2, preserve_newlines: true, max_preserve_newlines: 2, end_with_newline: true };

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const { id, kind, text } = event.data;
  try {
    const formatted =
      kind === 'Script' ? beautify.js(text, options) : kind === 'Stylesheet' ? beautify.css(text, options) : beautify.html(text, options);
    self.postMessage({ id, text: formatted } satisfies FormatResponse);
  } catch (err) {
    self.postMessage({ id, error: String(err) } satisfies FormatResponse);
  }
};
