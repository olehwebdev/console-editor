import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { useConsoleStore } from '@/entities/console-log';
import { useSettingsStore } from '@/entities/settings';
import { matchesFilter, useConsoleFilter } from '@/features/filter-console';
import { setSetting } from '@/features/update-settings';
import { ConsoleToolbar } from './ConsoleToolbar';
import { copyRows } from './copyRows';
import { EntryList } from './EntryList';
import { problemCounts } from './problemCounts';
import { PromptBar } from './PromptBar';
import { sinceInput } from './sinceInput';
import type { SaveAsAction } from './types';
import { useFrameDirectory } from './useFrameDirectory';

export interface ConsolePanelProps {
  /** What names the panel in its toolbar (the bottom pane's tabs); "Console" when not given. */
  heading?: ReactNode;
  onClose(): void;
  /** A row of code you ran asks to be kept as an action. */
  onSaveAsAction: SaveAsAction;
}

/**
 * The console of the page and every frame in it: one stream of their logs,
 * errors and the browser's messages, each row tagged with its frame, and a
 * prompt that runs code in the frame you pick.
 */
export function ConsolePanel({ heading, onClose, onSaveAsAction }: ConsolePanelProps) {
  const recording = useSettingsStore((s) => s.settings.captureConsole);
  const entries = useConsoleStore((s) => s.entries);
  const filter = useConsoleFilter(useShallow((s) => ({ frameKeys: s.frameKeys, levels: s.levels, text: s.text })));
  const { frames, labels, names, resolve } = useFrameDirectory();

  const shown = useMemo(() => entries.filter((e) => matchesFilter(e, filter, (id) => resolve(id)?.key ?? null)), [entries, filter, resolve]);
  const counts = useMemo(() => problemCounts(entries, resolve), [entries, resolve]);
  const since = useMemo(() => sinceInput(entries), [entries]);
  /** A frame no longer on the page is still named by the rows it left. */
  const labelOfKey = (key: string) => entries.map((e) => resolve(e.frameId)).find((f) => f?.key === key)?.label ?? key;

  return (
    <section aria-label="Console" data-testid="console-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <ConsoleToolbar frames={frames} labels={labels} counts={counts} heading={heading} onCopy={() => void copyRows(shown, resolve)} onClose={onClose} />
      {!recording ? (
        <EmptyState
          icon={icons.ConsoleIcon}
          title="The console isn't recording"
          size="sm"
          className="py-6"
          actions={
            <Button size="sm" variant="secondary" onClick={() => void setSetting('captureConsole', true)}>
              Turn it on
            </Button>
          }
        >
          Turn it on to see the logs of the page and all its frames, and to run code in them.
        </EmptyState>
      ) : shown.length ? (
        <EntryList entries={shown} resolve={resolve} since={since} onSaveAsAction={onSaveAsAction} />
      ) : (
        <p className="flex-1 px-3 py-2 text-[12px] text-fg-subtle">
          {entries.length ? 'No rows match the filters.' : 'Nothing logged yet. Logs and errors from the page and all its frames show up here.'}
        </p>
      )}
      <PromptBar frames={frames} labels={labels} names={names} labelOfKey={labelOfKey} />
    </section>
  );
}
