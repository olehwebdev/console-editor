import type { ResourceKind } from '@common/types';

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

/** A language an original source can be shown in, and its name for the status bar. */
export interface SourceLanguage {
  id: string;
  name: string;
}

export const PLAIN_TEXT: SourceLanguage = { id: 'plaintext', name: 'Plain text' };

const TYPESCRIPT: SourceLanguage = { id: 'typescript', name: 'TypeScript' };
const JAVASCRIPT: SourceLanguage = { id: 'javascript', name: 'JavaScript' };

/** An original's language by its file extension (lower-case). Frameworks' single-file components read best as HTML. */
export const SOURCE_LANGUAGES: Readonly<Record<string, SourceLanguage>> = {
  '.ts': TYPESCRIPT,
  '.mts': TYPESCRIPT,
  '.cts': TYPESCRIPT,
  '.tsx': { id: 'typescript', name: 'TypeScript JSX' },
  '.js': JAVASCRIPT,
  '.mjs': JAVASCRIPT,
  '.cjs': JAVASCRIPT,
  '.jsx': { id: 'javascript', name: 'JavaScript JSX' },
  '.css': { id: 'css', name: 'CSS' },
  '.scss': { id: 'scss', name: 'SCSS' },
  '.less': { id: 'less', name: 'Less' },
  '.html': { id: 'html', name: 'HTML' },
  '.htm': { id: 'html', name: 'HTML' },
  '.vue': { id: 'html', name: 'Vue' },
  '.svelte': { id: 'html', name: 'Svelte' },
  '.astro': { id: 'html', name: 'Astro' },
  '.json': { id: 'json', name: 'JSON' },
  '.md': { id: 'markdown', name: 'Markdown' },
  '.markdown': { id: 'markdown', name: 'Markdown' },
  '.mdx': { id: 'mdx', name: 'MDX' },
  '.coffee': { id: 'coffee', name: 'CoffeeScript' },
  '.graphql': { id: 'graphql', name: 'GraphQL' },
  '.gql': { id: 'graphql', name: 'GraphQL' },
  '.hbs': { id: 'handlebars', name: 'Handlebars' },
  '.handlebars': { id: 'handlebars', name: 'Handlebars' },
  '.pug': { id: 'pug', name: 'Pug' },
  '.yaml': { id: 'yaml', name: 'YAML' },
  '.yml': { id: 'yaml', name: 'YAML' },
};

/** The highlight-only twin a huge original opens in; languages without one fall back to plain text. */
export const LITE_TWIN: Readonly<Record<string, string>> = {
  typescript: LANGUAGES.Script.lite,
  javascript: LANGUAGES.Script.lite,
  css: LANGUAGES.Stylesheet.lite,
  scss: LANGUAGES.Stylesheet.lite,
  less: LANGUAGES.Stylesheet.lite,
  html: LANGUAGES.Document.lite,
};

/** A single-file component's block names its language in the query (`App.vue?vue&type=script&lang.ts`). */
export const LANG_QUERY_HINT = /[?&]lang[.=]([a-z]+)/i;
