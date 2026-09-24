import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib';
import { focusWhenFree, getActiveEditor, setActiveEditor, takeFocusRequest, trackTreeNavigation } from './editors';
import { guardFloatingWidgets } from './floatingGuard';
import { EDITOR_OPTIONS, FULL_EDITOR_OPTIONS, LITE_EDITOR_OPTIONS } from './options';
import { isLiteModel } from './languages';
import { monaco } from './setup';
import { THEME } from './theme';

type Model = monaco.editor.ITextModel;
type Editor = monaco.editor.IStandaloneCodeEditor;

/** Scroll/cursor position per model, so switching tabs returns you where you were. */
const viewStates = new WeakMap<Model, monaco.editor.ICodeEditorViewState | null>();

export interface CodeEditorProps {
  model: Model | null;
  /** Called once with the editor instance; may return a cleanup function. */
  onMount?: (editor: Editor) => void | (() => void);
  className?: string;
}

/** One long-lived Monaco editor; tabs swap its model. */
export function CodeEditor({ model, onMount, className }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;

  useEffect(() => {
    const editor = monaco.editor.create(host.current!, { ...EDITOR_OPTIONS, model: null, theme: THEME });
    editorRef.current = editor;
    setActiveEditor(editor);
    const focus = editor.onDidFocusEditorText(() => setActiveEditor(editor));
    const unguard = guardFloatingWidgets(host.current!, [editor]);
    const untrack = trackTreeNavigation();
    const cleanup = onMountRef.current?.(editor);
    return () => {
      cleanup?.();
      untrack();
      unguard();
      focus.dispose();
      if (getActiveEditor() === editor) setActiveEditor(null);
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const requested = takeFocusRequest(model);
    const previous = editor.getModel();
    if (previous === model) return;
    // setModel rebuilds the view, which drops DOM focus.
    const hadFocus = editor.hasWidgetFocus();
    if (previous && !previous.isDisposed()) viewStates.set(previous, editor.saveViewState());
    const usable = model && !model.isDisposed() ? model : null;
    editor.updateOptions(usable && isLiteModel(usable) ? LITE_EDITOR_OPTIONS : FULL_EDITOR_OPTIONS);
    editor.setModel(usable);
    if (!usable) return;
    const state = viewStates.get(usable);
    if (state) editor.restoreViewState(state);
    // Keep focus it had; take it only when asked (an open or switch), never from another control.
    if (hadFocus) editor.focus();
    else if (requested) return focusWhenFree(editor);
  }, [model]);

  return <div ref={host} className={cn('h-full w-full', className)} data-testid="code-editor" />;
}
