import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';
import type { Kind } from './types';

const { CssIcon, HtmlIcon, JsIcon } = icons;

/** Glyphs in the demos' rows, inputs and buttons. */
export const ICON_SIZE = 14;

export const KIND: Record<Kind, { glyph: IconGlyph; tint: string }> = {
  js: { glyph: JsIcon, tint: 'text-kind-js' },
  css: { glyph: CssIcon, tint: 'text-kind-css' },
  html: { glyph: HtmlIcon, tint: 'text-kind-html' },
};
