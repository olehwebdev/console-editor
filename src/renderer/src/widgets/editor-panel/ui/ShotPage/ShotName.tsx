import { useState } from 'react';
import type { Shot } from '@common/types';
import { KEY } from '@/shared/config';
import { renameShot } from '@/features/shot/manage';

/** A shot's name as the page's title; a click edits it in place (Enter or leaving keeps it, Esc drops it). */
export function ShotName({ shot }: { shot: Shot }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <button type="button" title="Rename" onClick={() => setDraft(shot.name)} className="min-w-0 truncate rounded-md px-1 text-left text-[15px] font-semibold text-fg outline-none hover:bg-hover focus-visible:bg-hover" data-testid="shot-name">
        {shot.name}
      </button>
    );
  }
  const done = async (keep: boolean) => {
    if (keep && !(await renameShot(shot, draft))) return;
    setDraft(null);
  };
  return (
    <input
      autoFocus
      value={draft}
      aria-label="Name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void done(true)}
      onKeyDown={(event) => {
        if (event.key === KEY.enter) void done(true);
        if (event.key === KEY.escape) void done(false);
      }}
      className="min-w-0 flex-1 rounded-md bg-surface-raised px-1 text-[15px] font-semibold text-fg outline-none ring-2 ring-accent/50"
      data-testid="shot-name-input"
    />
  );
}
