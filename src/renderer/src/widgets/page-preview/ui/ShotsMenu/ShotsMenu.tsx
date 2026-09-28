import { useState } from 'react';
import type { CaptureArea, Shot } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { PaneTabs } from '@/shared/ui/pane-tabs';
import { matchesShot, useMinute, useShotStore } from '@/entities/shot';
import { imageFilesOf } from '@/features/shot/import-design';
import { CaptureMenu } from './CaptureMenu';
import { FILES_TYPE, SHOT_FILTERS } from './constants';
import { ShotRow } from './ShotRow';
import type { ShotFilter } from './types';

export interface ShotsMenuProps {
  /** A page is shown, so there is something to capture. */
  hasPage: boolean;
  /** In the editor: picking an element and deleting are offered. */
  inEditor: boolean;
  onCapture(area: CaptureArea): void;
  onCaptureEverywhere(): void;
  onOpen(shot: Shot): void;
  /** Import designs: from the system's dialog (null), or images dropped or pasted on the menu. */
  onImport(files: File[] | null): void;
}

/**
 * The shots menu's content: capturing, importing designs (dropped or pasted too), a search, All · Captures · Designs,
 * and the workspace's shots, newest first.
 */
export function ShotsMenu({ hasPage, inEditor, onCapture, onCaptureEverywhere, onOpen, onImport }: ShotsMenuProps) {
  const shots = useShotStore((s) => s.shots);
  const now = useMinute();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ShotFilter>('all');
  const shown = shots.filter((s) => (filter === 'all' || s.kind === filter) && matchesShot(s, query.trim()));
  // Images dropped or pasted on the menu are imported as designs.
  const take = (data: DataTransfer | null) => {
    const files = imageFilesOf(data);
    if (files.length) onImport(files);
    return files.length > 0;
  };
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="shots-menu"
      onDragOver={(event) => event.dataTransfer.types.includes(FILES_TYPE) && event.preventDefault()}
      onDrop={(event) => take(event.dataTransfer) && event.preventDefault()}
      onPaste={(event) => take(event.clipboardData) && event.preventDefault()}
    >
      <div className="flex items-center gap-2">
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captures and designs…" aria-label="Search captures and designs" leading={<Icon icon={icons.SearchIcon} size={14} />} className="flex-1" />
        <IconButton icon={icons.ImportDesignIcon} label="Import designs…" size="sm" onClick={() => onImport(null)} data-testid="shots-import" />
        <CaptureMenu canPick={inEditor} disabled={!hasPage} onCapture={onCapture} onCaptureEverywhere={onCaptureEverywhere} />
      </div>
      <div className="h-7">
        <PaneTabs<ShotFilter> tabs={SHOT_FILTERS} value={filter} onChange={setFilter} label="Show" />
      </div>
      <div className="flex max-h-96 flex-col overflow-y-auto">
        {shown.map((shot) => (
          <ShotRow key={shot.id} shot={shot} now={now} canDelete={inEditor} onOpen={onOpen} />
        ))}
        {shown.length ? null : (
          <p className="px-2 py-4 text-center text-[12px] text-fg-subtle">
            {shots.length ? 'Nothing matches.' : 'No captures yet. Capture the page to keep how it looks now, or drop a design here to check the page against it.'}
          </p>
        )}
      </div>
    </div>
  );
}
