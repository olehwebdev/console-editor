export { monaco } from './setup';
export { languageFor, languageForPath, type SourceLanguage } from './languages';
export { READ_ONLY_URI_AUTHORITY, isReadOnlyModel } from './models';
export { CodeEditor, type CodeEditorProps } from './CodeEditor';
export { DiffEditor, type DiffEditorProps } from './DiffEditor';
export { dismissEditorWidgets, editorHasFocus, getActiveEditor, requestEditorFocus, requestReveal, triggerInActiveEditor } from './editors';
export { setModelSchema } from './json';
export { keybindingOf } from './keybindingOf';
