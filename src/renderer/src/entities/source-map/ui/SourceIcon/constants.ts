import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';

export interface SourceGlyph {
  icon: IconGlyph;
  className: string;
}

const TS: SourceGlyph = { icon: icons.TsIcon, className: 'text-info' };
const JSX: SourceGlyph = { icon: icons.JsxIcon, className: 'text-info' };
const JS: SourceGlyph = { icon: icons.JsIcon, className: 'text-kind-js' };
const CSS: SourceGlyph = { icon: icons.CssIcon, className: 'text-kind-css' };
const HTML: SourceGlyph = { icon: icons.HtmlIcon, className: 'text-kind-html' };

/** An original's glyph by its extension (or a `lang` query hint): the file kinds' tints, TypeScript and JSX in the info tint. */
export const SOURCE_GLYPHS: Record<string, SourceGlyph> = {
  ts: TS,
  mts: TS,
  cts: TS,
  tsx: JSX,
  jsx: JSX,
  js: JS,
  mjs: JS,
  cjs: JS,
  css: CSS,
  scss: CSS,
  sass: CSS,
  less: CSS,
  styl: CSS,
  html: HTML,
  htm: HTML,
  vue: HTML,
  svelte: HTML,
  astro: HTML,
};

/** Any other original. */
export const OTHER_SOURCE_GLYPH: SourceGlyph = { icon: icons.CodeFileIcon, className: 'text-fg-muted' };

/** `lang.ts` or `lang=scss` in a query (a Vue block's language). */
export const LANG_HINT = /[?&]lang[.=]([a-z0-9]+)/i;
/** A file name's extension. */
export const EXTENSION = /\.([a-z0-9]+)$/i;
