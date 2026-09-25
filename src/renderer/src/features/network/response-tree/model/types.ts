import type { JsonNode } from '@common/json';

export interface ResponseViews {
  /** Tabs showing their response as a tree (by tab id); the others show the text. */
  tree: Readonly<Record<string, true>>;
  /** Each tab's open objects and arrays, by row id: kept while you look at another tab. */
  open: Readonly<Record<string, readonly string[]>>;

  toggle(tabId: string): void;
  setOpen(tabId: string, open: readonly string[]): void;
}

/** A tab's text, and the JSON tree it holds or why it holds none. */
export type TabJson = { text: string; root: JsonNode; error?: undefined } | { text: string; root?: undefined; error: string };
