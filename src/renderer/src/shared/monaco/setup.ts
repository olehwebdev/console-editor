import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { conf as cssConf, language as cssLanguage } from 'monaco-editor/languages/definitions/css/css';
import { conf as htmlConf, language as htmlLanguage } from 'monaco-editor/languages/definitions/html/html';
import { conf as jsConf, language as jsLanguage } from 'monaco-editor/languages/definitions/javascript/javascript';
import { JSON_LITE_CONF, JSON_LITE_LANGUAGE } from './json/constants';
import { LANGUAGES } from './languages';
import { defineThemes, THEME } from './theme';

/** The language worker for each Monaco language label; any other label gets the plain editor worker. */
const LANGUAGE_WORKERS: Record<string, new () => Worker> = {
  css: CssWorker,
  scss: CssWorker,
  less: CssWorker,
  html: HtmlWorker,
  handlebars: HtmlWorker,
  razor: HtmlWorker,
  typescript: TsWorker,
  javascript: TsWorker,
  json: JsonWorker,
};

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    const LanguageWorker = Object.hasOwn(LANGUAGE_WORKERS, label) ? LANGUAGE_WORKERS[label] : EditorWorker;
    return new LanguageWorker();
  },
};

// Highlight-only languages for large files (see LARGE_FILE_CHARS): the stock
// Monarch grammars under ids no language service listens to. HTML's embedded
// scripts and styles only borrow the other grammars' tokenizers.
const LITE_GRAMMARS: Array<[id: string, alias: string, conf: monaco.languages.LanguageConfiguration, language: monaco.languages.IMonarchLanguage]> = [
  [LANGUAGES.Script.lite, 'JavaScript (large file)', jsConf, jsLanguage],
  [LANGUAGES.Stylesheet.lite, 'CSS (large file)', cssConf, cssLanguage],
  [LANGUAGES.Document.lite, 'HTML (large file)', htmlConf, htmlLanguage],
  [LANGUAGES.Fetch.lite, 'JSON (large file)', JSON_LITE_CONF, JSON_LITE_LANGUAGE],
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

// Only original sources, which are read-only, open as TypeScript: their imports can't resolve here,
// so every check would be noise.
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true, noSuggestionDiagnostics: true });
monaco.typescript.typescriptDefaults.setCompilerOptions({
  allowNonTsExtensions: true,
  jsx: monaco.typescript.JsxEmit.Preserve,
  target: monaco.typescript.ScriptTarget.ESNext,
});

defineThemes();
monaco.editor.setTheme(THEME);

export { monaco };
