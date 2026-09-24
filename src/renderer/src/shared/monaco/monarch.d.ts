// Monaco ships its Monarch grammars untyped; setup.ts reuses them for the lite languages.

declare module 'monaco-editor/languages/definitions/css/css' {
  import type { languages } from 'monaco-editor';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}

declare module 'monaco-editor/languages/definitions/html/html' {
  import type { languages } from 'monaco-editor';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}
