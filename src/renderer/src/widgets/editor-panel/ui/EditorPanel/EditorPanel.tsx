import { AnimatePresence, motion } from 'motion/react';
import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { EASE_OUT, fileName } from '@/shared/lib';
import { CodeEditor, DiffEditor } from '@/shared/monaco';
import { EditorTabs } from '@/shared/ui/editor-tabs';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Kbd } from '@/shared/ui/kbd';
import { getTabModel, selectActivePage, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { KindIcon } from '@/entities/resource';
import { closeTab } from '@/features/close-tab';
import { closeDiff, useDiffSource } from '@/features/compare-changes';
import { WhatsNewPage } from '@/features/update-app';
import { FileHeader } from '../FileHeader';
import { useEditorActions } from './useEditorActions';
import { useFocusOnOpen } from './useFocusOnOpen';

const STEPS: Array<{ keys?: string[]; text: string }> = [
  { text: 'Enter the site’s URL in the preview’s address bar.' },
  { text: 'Pick a script, stylesheet or the HTML under Page resources — minified files are pretty-printed.' },
  { keys: SHORTCUT.save, text: 'Save: the page reloads running your version of the file.' },
  { keys: SHORTCUT.palette, text: 'Jump to any file or command.' },
];

/** Tab icons: a file's kind and a page's glyph line up. */
const TAB_ICON_SIZE = 13;

/** The empty state fading in or out, in seconds. */
const EMPTY_FADE_DURATION = 0.2;

/** Tabs, file header and the Monaco editor (or diff) for the active file. */
export function EditorPanel() {
  // Select the store's own array (a stable reference); new objects from a selector would re-render forever.
  const tabs = useTabStore((s) => s.tabs);
  const pages = useTabStore((s) => s.pages);
  const activeId = useTabStore((s) => s.activeId);
  const active = useTabStore(selectActiveTab);
  const activePage = useTabStore(selectActivePage);
  const diff = useTabStore((s) => s.diff);
  const original = useDiffSource((s) => s.original);
  const originalLabel = useDiffSource((s) => s.label);
  const activate = useTabStore((s) => s.activate);
  const onMount = useEditorActions();
  const model = getTabModel(activeId);
  useFocusOnOpen();

  return (
    <section className="flex h-full min-w-0 flex-col bg-surface-editor" aria-label="Editor" data-testid="editor-panel">
      {tabs.length || pages.length ? (
        <EditorTabs
          items={[
            ...tabs.map((t) => ({
              id: t.id,
              label: fileName(t.url),
              icon: <KindIcon kind={t.kind} size={TAB_ICON_SIZE} />,
              dirty: t.dirty,
              italic: !t.overrideId,
              title: `${t.url}${t.overrideId ? '' : '\nNot saved as an override yet'}`,
            })),
            ...pages.map((p) => ({ id: p.id, label: p.title, icon: <Icon icon={icons.WhatsNewIcon} size={TAB_ICON_SIZE} className="text-accent" />, title: p.title })),
          ]}
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

        {activePage ? (
          <div className="absolute inset-0">
            <WhatsNewPage />
          </div>
        ) : null}

        <AnimatePresence>
          {!active && !activePage ? (
            <motion.div
              key="empty"
              className="absolute inset-0 flex items-center justify-center bg-surface-editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: EMPTY_FADE_DURATION, ease: EASE_OUT }}
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
