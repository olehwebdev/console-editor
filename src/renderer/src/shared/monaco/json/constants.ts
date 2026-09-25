import type { languages } from 'monaco-editor';

/**
 * JSON for a response too large for the language service (see LARGE_FILE_CHARS): colours only, with
 * the service's token names, so the theme paints it the same.
 */
export const JSON_LITE_LANGUAGE: languages.IMonarchLanguage = {
  tokenPostfix: '.json',
  tokenizer: {
    root: [
      [/"(?:[^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
      [/"(?:[^"\\]|\\.)*"/, 'string.value'],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
      [/\b(?:true|false|null)\b/, 'keyword'],
      [/[{}[\]]/, 'delimiter.bracket'],
      [/[,:]/, 'delimiter'],
    ],
  },
};

export const JSON_LITE_CONF: languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
};
