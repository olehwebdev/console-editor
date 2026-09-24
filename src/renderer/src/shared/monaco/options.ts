import type { monaco } from './setup';

export const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily: "'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 21,
  fontLigatures: true,
  tabSize: 2,
  padding: { top: 12, bottom: 12 },
  minimap: { enabled: true, renderCharacters: false, scale: 1, showSlider: 'mouseover' },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',
  roundedSelection: true,
  guides: { indentation: true, bracketPairs: 'active' },
  bracketPairColorization: { enabled: true },
  stickyScroll: { enabled: true },
  fixedOverflowWidgets: true,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
  overviewRulerBorder: false,
};

/**
 * For files at or above LARGE_FILE_CHARS: whole-file features (bracket-pair
 * colorization, sticky scroll, folding, minimap, occurrence highlights…) scan
 * every line and cost hundreds of MB on multi-MB bundles. Monaco's own
 * `largeFileOptimizations` only kicks in at 20 MB, so we apply our own.
 */
export const LITE_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  bracketPairColorization: { enabled: false },
  guides: { indentation: false, bracketPairs: false },
  stickyScroll: { enabled: false },
  folding: false,
  minimap: { enabled: false },
  occurrencesHighlight: 'off',
  selectionHighlight: false,
  links: false,
  colorDecorators: false,
  matchBrackets: 'never',
  renderWhitespace: 'none',
  unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false, nonBasicASCII: false },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
};

/** The values LITE_EDITOR_OPTIONS overrides, restored for normal files. */
export const FULL_EDITOR_OPTIONS: monaco.editor.IEditorOptions = {
  bracketPairColorization: EDITOR_OPTIONS.bracketPairColorization,
  guides: EDITOR_OPTIONS.guides,
  stickyScroll: EDITOR_OPTIONS.stickyScroll,
  folding: true,
  minimap: EDITOR_OPTIONS.minimap,
  occurrencesHighlight: 'singleFile',
  selectionHighlight: true,
  links: true,
  colorDecorators: true,
  matchBrackets: 'always',
  renderWhitespace: EDITOR_OPTIONS.renderWhitespace,
  unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true, nonBasicASCII: 'inUntrustedWorkspace' },
  quickSuggestions: { other: true, comments: false, strings: false },
  suggestOnTriggerCharacters: true,
};
