export { monaco } from './setup';
export { languageFor, languageForPath, isLiteModel, LARGE_FILE_CHARS, JS_LITE, type SourceLanguage } from './languages';
export { READ_ONLY_URI_AUTHORITY, isReadOnlyModel } from './models';
export { CodeEditor, type CodeEditorProps } from './CodeEditor';
export { DiffEditor, type DiffEditorProps } from './DiffEditor';
export { dismissEditorWidgets, editorHasFocus, getActiveEditor, requestEditorFocus, requestReveal, triggerInActiveEditor } from './editors';
export { keybindingOf } from './keybindingOf';
export { THEME } from './theme';
