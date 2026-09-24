import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { conf as jsConf, language as jsLanguage } from 'monaco-editor/languages/definitions/javascript/javascript';
import type { ResourceKind } from '@common/types';
import { defineThemes, THEME } from './theme';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

/**
 * Files at or above this size open as `javascript-lite`: syntax highlighting
 * only, no TypeScript language service. Monaco already loads that service
 * lazily (on the first `javascript` model), so small files still get syntax
 * errors while multi-MB bundles never pay for a TS program in a worker.
 */
export const LARGE_FILE_CHARS = 1_000_000;
export const JS_LITE = 'javascript-lite';

monaco.languages.register({ id: JS_LITE, aliases: ['JavaScript (large file)'] });
monaco.languages.setMonarchTokensProvider(JS_LITE, jsLanguage);
monaco.languages.setLanguageConfiguration(JS_LITE, jsConf);

// Bundles reference globals from other files, so semantic checks would only be noise.
// Syntax errors are still reported, which catches a broken patch before reload.
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
monaco.typescript.javascriptDefaults.setCompilerOptions({
  allowJs: true,
  allowNonTsExtensions: true,
  target: monaco.typescript.ScriptTarget.ESNext,
});

defineThemes();
monaco.editor.setTheme(THEME);

export function languageFor(kind: ResourceKind, length: number): string {
  switch (kind) {
    case 'Script':
      return length >= LARGE_FILE_CHARS ? JS_LITE : 'javascript';
    case 'Stylesheet':
      return 'css';
    case 'Document':
      return 'html';
  }
}

export { monaco };
