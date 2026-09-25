import { useCallback } from 'react';
import { SHORTCUT } from '@common/constants';
import { isReadOnlyModel, keybindingOf, type monaco } from '@/shared/monaco';
import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { goToBundle, goToOriginal } from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { isBundleModel } from '../../lib/isBundleModel';

/** Monaco action ids, one per action (namespaced so they can't clash with Monaco's own). */
const ACTION_ID = {
  save: 'console-editor.save',
  format: 'console-editor.format',
  diff: 'console-editor.diff',
  goToOriginal: 'console-editor.go-to-original',
  goToBundle: 'console-editor.go-to-bundle',
} as const;

/** Context keys saying which way a jump goes from the shown model; the jump actions need one. */
const CONTEXT_KEY = { bundleTab: 'consoleEditor.bundleTab', sourceTab: 'consoleEditor.sourceTab' } as const;
/** Monaco's context-menu group for going somewhere (Go to Definition…), and the jumps' places in it. */
const CONTEXT_MENU_GROUP = 'navigation';
const JUMP_MENU_ORDER = { original: 1.5, bundle: 1.6 } as const;

/**
 * Monaco actions shared by the code and diff editors. The jump actions take the key only where they
 * apply; elsewhere it reaches the app menu, which explains.
 */
export function useEditorActions() {
  return useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const bundleTab = editor.createContextKey<boolean>(CONTEXT_KEY.bundleTab, false);
    const sourceTab = editor.createContextKey<boolean>(CONTEXT_KEY.sourceTab, false);
    const syncContextKeys = () => {
      const model = editor.getModel();
      bundleTab.set(isBundleModel(model));
      sourceTab.set(!!model && isReadOnlyModel(model));
    };
    syncContextKeys();
    const disposables = [
      editor.onDidChangeModel(syncContextKeys),
      editor.addAction({ id: ACTION_ID.save, label: 'Save Override', keybindings: [keybindingOf(SHORTCUT.save)], run: () => void saveTab() }),
      editor.addAction({
        id: ACTION_ID.format,
        label: 'Pretty-print Document',
        keybindings: [keybindingOf(SHORTCUT.format)],
        run: () => void formatTab(),
      }),
      editor.addAction({
        id: ACTION_ID.diff,
        label: 'Toggle Diff',
        keybindings: [keybindingOf(SHORTCUT.diff)],
        run: () => toggleBaseDiff(),
      }),
      editor.addAction({
        id: ACTION_ID.goToOriginal,
        label: 'Go to Original Source',
        precondition: CONTEXT_KEY.bundleTab,
        keybindings: [keybindingOf(SHORTCUT.jumpToMapped)],
        contextMenuGroupId: CONTEXT_MENU_GROUP,
        contextMenuOrder: JUMP_MENU_ORDER.original,
        run: () => void goToOriginal(),
      }),
      editor.addAction({
        id: ACTION_ID.goToBundle,
        label: 'Go to Bundle Code',
        precondition: CONTEXT_KEY.sourceTab,
        keybindings: [keybindingOf(SHORTCUT.jumpToMapped)],
        contextMenuGroupId: CONTEXT_MENU_GROUP,
        contextMenuOrder: JUMP_MENU_ORDER.bundle,
        run: () => void goToBundle(),
      }),
    ];
    return () => disposables.forEach((d) => d.dispose());
  }, []);
}
