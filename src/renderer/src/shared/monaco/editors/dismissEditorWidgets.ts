import { triggerInActiveEditor } from './triggerInActiveEditor';

/** Monaco's handler ids that close each floating widget. */
const HIDE_WIDGET_HANDLERS = {
  suggestions: 'hideSuggestWidget',
  parameterHints: 'closeParameterHints',
  hover: 'editor.action.hideHover',
} as const;

/**
 * Closes the active editor's floating widgets (suggestions, parameter hints,
 * hover). One left open over the page view keeps it frozen on a snapshot,
 * which would hide the reload that follows a save.
 */
export function dismissEditorWidgets(): void {
  for (const id of Object.values(HIDE_WIDGET_HANDLERS)) triggerInActiveEditor(id);
}
