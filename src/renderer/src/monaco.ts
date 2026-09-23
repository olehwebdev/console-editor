import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import type { ResourceKind } from '../../shared/types';

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

// Bundles reference globals from other files, so semantic checks would only be noise.
// Syntax errors are still reported, which is what catches a broken patch before reload.
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});
monaco.typescript.javascriptDefaults.setCompilerOptions({
  allowJs: true,
  allowNonTsExtensions: true,
  target: monaco.typescript.ScriptTarget.ESNext,
});

export function languageFor(kind: ResourceKind): string {
  switch (kind) {
    case 'Script':
      return 'javascript';
    case 'Stylesheet':
      return 'css';
    case 'Document':
      return 'html';
  }
}

export { monaco };
