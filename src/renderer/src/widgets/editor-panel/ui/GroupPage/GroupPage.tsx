import { useState } from 'react';
import type { PageTabOf } from '@/entities/editor-tab';
import { useShotStore } from '@/entities/shot';
import { GroupCell } from './GroupCell';
import { GroupHeader } from './GroupHeader';
import type { GroupView } from './types';

/**
 * Captures taken together in every browser, side by side: each compared with a baseline (the app's capture at first,
 * another of them, or a design), with the share of its pixels that differ.
 */
export function GroupPage({ page }: { page: PageTabOf<'group'> }) {
  const shots = useShotStore((s) => s.shots);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [view, setView] = useState<GroupView>('captures');
  // Newest first in the store: the app's capture, taken first, leads.
  const members = shots.filter((s) => s.group === page.groupId).reverse();
  const designs = shots.filter((s) => s.kind === 'design');
  const base = [...members, ...designs].find((s) => s.id === baseId) ?? members[0];
  if (!base) return <div className="grid h-full place-items-center bg-surface-editor text-[13px] text-fg-subtle">These captures were deleted.</div>;

  return (
    <div className="flex h-full flex-col bg-surface-editor" data-testid="group-page">
      <GroupHeader members={members} designs={designs} base={base} onBase={setBaseId} view={view} onView={setView} />
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 overflow-y-auto p-4">
        {members.map((shot) => (
          <GroupCell key={shot.id} shot={shot} base={base} view={view} />
        ))}
      </div>
    </div>
  );
}
