import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { icons } from '@/shared/config';
import { EASE_OUT, fileName } from '@/shared/lib';
import { CodeEditor, DiffEditor, monaco } from '@/shared/monaco';
import { EditorTabs } from '@/shared/ui/editor-tabs';
import { EmptyState } from '@/shared/ui/empty-state';
import { IconButton } from '@/shared/ui/icon-button';
import { Kbd } from '@/shared/ui/kbd';
import { getTabModel, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { KindIcon } from '@/entities/resource';
import { closeTab } from '@/features/close-tab';
import { closeDiff, toggleBaseDiff, useDiffSource } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { saveTab } from '@/features/save-override';
import { FileHeader } from './FileHeader';

const STEPS: Array<{ keys?: string[]; text: string }> = [
  { text: 'Enter the site’s URL in the preview’s address bar.' },
  { text: 'Pick a script, stylesheet or the HTML under Page resources — minified files are pretty-printed.' },
  { keys: ['mod', 'S'], text: 'Save: the page reloads running your version of the file.' },
  { keys: ['mod', 'K'], text: 'Jump to any file or command.' },
];

/** Monaco actions shared by the code and diff editors. */
function useEditorActions() {
  return useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const disposables = [
      editor.addAction({ id: 'console-editor.save', label: 'Save Override', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS], run: () => void saveTab() }),
      editor.addAction({
        id: 'console-editor.format',
        label: 'Pretty-print Document',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
        run: () => void formatTab(),
      }),
      editor.addAction({
        id: 'console-editor.diff',
        label: 'Toggle Diff',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
        run: () => toggleBaseDiff(),
      }),
    ];
    return () => disposables.forEach((d) => d.dispose());
  }, []);
}

/** Tabs, file header and the Monaco editor (or diff) for the active file. */
export function EditorPanel() {
  // Select the store's own array (a stable reference); new objects from a selector would re-render forever.
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);
  const active = useTabStore(selectActiveTab);
  const diff = useTabStore((s) => s.diff);
  const original = useDiffSource((s) => s.original);
  const originalLabel = useDiffSource((s) => s.label);
  const activate = useTabStore((s) => s.activate);
  const onMount = useEditorActions();
  const model = getTabModel(activeId);

  return (
    <section className="flex h-full min-w-0 flex-col bg-surface-editor" aria-label="Editor" data-testid="editor-panel">
      {tabs.length ? (
        <EditorTabs
          items={tabs.map((t) => ({
            id: t.id,
            label: fileName(t.url),
            icon: <KindIcon kind={t.kind} size={13} />,
            dirty: t.dirty,
            italic: !t.overrideId,
            title: `${t.url}${t.overrideId ? '' : '\nNot saved as an override yet'}`,
          }))}
          activeId={activeId}
          onSelect={activate}
          onClose={(id) => void closeTab(id)}
        />
      ) : null}
      {active ? <FileHeader tab={active} /> : null}

      <div className="relative min-h-0 flex-1">
        {active && diff !== 'off' && original && model ? (
          <div className="flex h-full flex-col">
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 text-[12px] text-fg-muted">
              <span className="flex-1 truncate">
                <span className="text-danger/90">{originalLabel}</span>
                <span className="mx-2 text-fg-subtle">→</span>
                <span className="text-live/90">Your version</span>
              </span>
              <IconButton icon={icons.CloseIcon} label="Close diff" size="sm" onClick={closeDiff} />
            </div>
            <div className="min-h-0 flex-1">
              <DiffEditor original={original} modified={model} onMount={onMount} />
            </div>
          </div>
        ) : null}
        {/* The code editor stays mounted (hidden while diffing) so view state and undo survive. */}
        <div className={active && diff !== 'off' && original ? 'hidden' : 'h-full'}>
          <CodeEditor model={model} onMount={onMount} />
        </div>

        <AnimatePresence>
          {!active ? (
            <motion.div
              key="empty"
              className="absolute inset-0 flex items-center justify-center bg-surface-editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <EmptyState icon={icons.SparklesIcon} title="Patch a live website without rebuilding it" className="max-w-[440px]">
                <ol className="mt-3 flex flex-col gap-2.5 text-left">
                  {STEPS.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-fg-muted">
                      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-hover text-[11px] font-medium text-fg">{i + 1}</span>
                      <span className="flex-1">{step.text}</span>
                      {step.keys ? <Kbd keys={step.keys} /> : null}
                    </li>
                  ))}
                </ol>
              </EmptyState>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
