import beautify from 'js-beautify';
import type { ResourceKind } from '@common/types';
import { BEAUTIFY_OPTIONS } from './constants';

export interface FormatRequest {
  id: number;
  kind: ResourceKind;
  text: string;
}

export type FormatResponse = { id: number; text: string } | { id: number; error: string };

/** The beautifier for each kind: a new ResourceKind fails typecheck until it has one. */
const BEAUTIFIERS: Record<ResourceKind, (text: string, opts: typeof BEAUTIFY_OPTIONS) => string> = {
  Script: beautify.js,
  Stylesheet: beautify.css,
  Document: beautify.html,
  // A response's JSON is formatted as text: parsing it would round big ids and drop duplicate keys.
  Fetch: beautify.js,
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
