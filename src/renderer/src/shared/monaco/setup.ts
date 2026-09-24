import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { conf as cssConf, language as cssLanguage } from 'monaco-editor/languages/definitions/css/css';
import { conf as htmlConf, language as htmlLanguage } from 'monaco-editor/languages/definitions/html/html';
import { conf as jsConf, language as jsLanguage } from 'monaco-editor/languages/definitions/javascript/javascript';
import { LANGUAGES } from './languages';
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

// Highlight-only languages for large files (see LARGE_FILE_CHARS): the stock
// Monarch grammars under ids no language service listens to. HTML's embedded
// scripts and styles only borrow the other grammars' tokenizers.
const LITE_GRAMMARS: Array<[id: string, alias: string, conf: monaco.languages.LanguageConfiguration, language: monaco.languages.IMonarchLanguage]> = [
  [LANGUAGES.Script.lite, 'JavaScript (large file)', jsConf, jsLanguage],
  [LANGUAGES.Stylesheet.lite, 'CSS (large file)', cssConf, cssLanguage],
  [LANGUAGES.Document.lite, 'HTML (large file)', htmlConf, htmlLanguage],
];
for (const [id, alias, conf, language] of LITE_GRAMMARS) {
  monaco.languages.register({ id, aliases: [alias] });
  monaco.languages.setMonarchTokensProvider(id, language);
  monaco.languages.setLanguageConfiguration(id, conf);
}

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

export { monaco };
