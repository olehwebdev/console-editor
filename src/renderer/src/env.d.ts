/// <reference types="vite/client" />

declare module 'monaco-editor/languages/definitions/javascript/javascript' {
  import type { languages } from 'monaco-editor';
  export const conf: languages.LanguageConfiguration;
  export const language: languages.IMonarchLanguage;
}
