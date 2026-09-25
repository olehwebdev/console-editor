import type { monaco } from '../setup';

/** What the editor functions share. Mutated in place (importers can't reassign another module's bindings). */
export const editorState: {
  /**
   * Registry of live editor instances (non-serializable, so they stay out of
   * stores). Commands like undo or "focus editor" go to the active one.
   */
  active: monaco.editor.ICodeEditor | null;
  /** The model the code editor takes focus for when it next shows it; see `requestEditorFocus`. */
  focusRequest: monaco.editor.ITextModel | null;
  /** Where the code editor puts the cursor when it next shows a model; see `requestReveal`. */
  revealRequest: { model: monaco.editor.ITextModel; position: monaco.IPosition } | null;
  /** The user's latest input was keyboard navigation in a tree (arrows, type-ahead), not a click or Enter/Space. */
  navigatingTree: boolean;
} = {
  active: null,
  focusRequest: null,
  revealRequest: null,
  navigatingTree: false,
};
