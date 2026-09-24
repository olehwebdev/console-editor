import beautify from 'js-beautify';
import type { ResourceKind } from '@common/types';

export interface FormatRequest {
  id: number;
  kind: ResourceKind;
  text: string;
}

export type FormatResponse = { id: number; text: string } | { id: number; error: string };

const BEAUTIFY_OPTIONS = { indent_size: 2, preserve_newlines: true, max_preserve_newlines: 2, end_with_newline: true };

/** The beautifier for each kind: a new ResourceKind fails typecheck until it has one. */
const BEAUTIFIERS: Record<ResourceKind, (text: string, opts: typeof BEAUTIFY_OPTIONS) => string> = {
  Script: beautify.js,
  Stylesheet: beautify.css,
  Document: beautify.html,
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const { id, kind, text } = event.data;
  try {
    const formatted = BEAUTIFIERS[kind](text, BEAUTIFY_OPTIONS);
    self.postMessage({ id, text: formatted } satisfies FormatResponse);
  } catch (err) {
    self.postMessage({ id, error: String(err) } satisfies FormatResponse);
  }
};
