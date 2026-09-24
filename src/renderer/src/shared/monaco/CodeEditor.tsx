import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib';
import { getActiveEditor, setActiveEditor } from './editors';
import { guardFloatingWidgets } from './floatingGuard';
import { EDITOR_OPTIONS, FULL_EDITOR_OPTIONS, LITE_EDITOR_OPTIONS } from './options';
import { LARGE_FILE_CHARS, monaco } from './setup';
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
    const cleanup = onMountRef.current?.(editor);
    return () => {
      cleanup?.();
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
    const previous = editor.getModel();
    if (previous === model) return;
    if (previous && !previous.isDisposed()) viewStates.set(previous, editor.saveViewState());
    const usable = model && !model.isDisposed() ? model : null;
    editor.updateOptions(usable && usable.getValueLength() >= LARGE_FILE_CHARS ? LITE_EDITOR_OPTIONS : FULL_EDITOR_OPTIONS);
    editor.setModel(usable);
    if (model && !model.isDisposed()) {
      const state = viewStates.get(model);
      if (state) editor.restoreViewState(state);
      editor.focus();
    }
  }, [model]);

  return <div ref={host} className={cn('h-full w-full', className)} data-testid="code-editor" />;
}
