import type { ResourceKind } from '@common/types';
import type { monaco } from './setup';

/**
 * Files at or above this size open in a lite language: Monarch syntax
 * highlighting only, with no language service behind it (no TypeScript
 * program, CSS validation or HTML completion in a worker). Monaco starts a
 * language's service on its first model, so small files keep their checks
 * while multi-MB bundles never pay for them.
 */
export const LARGE_FILE_CHARS = 1_000_000;

/** Each kind's language and its highlight-only twin (registered in setup.ts). */
export const LANGUAGES: Record<ResourceKind, { full: string; lite: string }> = {
  Script: { full: 'javascript', lite: 'javascript-lite' },
  Stylesheet: { full: 'css', lite: 'css-lite' },
  Document: { full: 'html', lite: 'html-lite' },
};

export const JS_LITE = LANGUAGES.Script.lite;

const LITE = new Set(Object.values(LANGUAGES).map((l) => l.lite));

export function languageFor(kind: ResourceKind, length: number): string {
  return length >= LARGE_FILE_CHARS ? LANGUAGES[kind].lite : LANGUAGES[kind].full;
}

/** Lite editor options go with a lite language, and with any model that has since grown past the threshold. */
export function isLiteModel(model: Pick<monaco.editor.ITextModel, 'getLanguageId' | 'getValueLength'>): boolean {
  return LITE.has(model.getLanguageId()) || model.getValueLength() >= LARGE_FILE_CHARS;
}
