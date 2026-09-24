import { useCallback } from 'react';
import { monaco } from '@/shared/monaco';
import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { saveTab } from '@/features/save-override';

/** Monaco action ids, one per action (namespaced so they can't clash with Monaco's own). */
const ACTION_ID = { save: 'console-editor.save', format: 'console-editor.format', diff: 'console-editor.diff' } as const;

/** Monaco actions shared by the code and diff editors. */
export function useEditorActions() {
  return useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const disposables = [
      editor.addAction({ id: ACTION_ID.save, label: 'Save Override', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS], run: () => void saveTab() }),
      editor.addAction({
        id: ACTION_ID.format,
        label: 'Pretty-print Document',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
        run: () => void formatTab(),
      }),
      editor.addAction({
        id: ACTION_ID.diff,
        label: 'Toggle Diff',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
        run: () => toggleBaseDiff(),
      }),
    ];
    return () => disposables.forEach((d) => d.dispose());
  }, []);
}
