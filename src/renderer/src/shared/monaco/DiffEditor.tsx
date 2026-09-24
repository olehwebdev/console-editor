import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib';
import { focusWhenFree, getActiveEditor, setActiveEditor } from './editors';
import { guardFloatingWidgets } from './floatingGuard';
import { EDITOR_OPTIONS, FULL_EDITOR_OPTIONS, LITE_EDITOR_OPTIONS } from './options';
import { isLiteModel } from './languages';
import { monaco } from './setup';
import { THEME } from './theme';

type Model = monaco.editor.ITextModel;
type Diff = monaco.editor.IStandaloneDiffEditor;

export interface DiffEditorProps {
  /** Left, read-only side (owned by the caller). */
  original: Model;
  /** Right, editable side: the tab's own model. */
  modified: Model;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void | (() => void);
  className?: string;
}

/** Side-by-side diff; falls back to inline when the pane is narrow. Never disposes the models it shows. */
export function DiffEditor({ original, modified, onMount, className }: DiffEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const diffRef = useRef<Diff | null>(null);
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;

  useEffect(() => {
    const diff = monaco.editor.createDiffEditor(host.current!, {
      ...EDITOR_OPTIONS,
      theme: THEME,
      originalEditable: false,
      renderSideBySide: true,
      useInlineViewWhenSpaceIsLimited: true,
      ignoreTrimWhitespace: false,
      renderOverviewRuler: false,
    });
    diffRef.current = diff;
    const edited = diff.getModifiedEditor();
    setActiveEditor(edited);
    const unguard = guardFloatingWidgets(host.current!, [diff.getOriginalEditor(), edited]);
    const cleanup = onMountRef.current?.(edited);
    return () => {
      cleanup?.();
      unguard();
      if (getActiveEditor() === edited) setActiveEditor(null);
      diff.setModel(null);
      diff.dispose();
      diffRef.current = null;
    };
  }, []);

  useEffect(() => {
    const diff = diffRef.current;
    if (!diff) return;
    diff.updateOptions(isLiteModel(original) || isLiteModel(modified) ? LITE_EDITOR_OPTIONS : FULL_EDITOR_OPTIONS);
    diff.setModel({ original, modified });
    // Every diff shown here was asked for; still, never pull focus from a field or the tab strip.
    return focusWhenFree(diff.getModifiedEditor());
  }, [original, modified]);

  return <div ref={host} className={cn('h-full w-full', className)} data-testid="diff-editor" />;
}
