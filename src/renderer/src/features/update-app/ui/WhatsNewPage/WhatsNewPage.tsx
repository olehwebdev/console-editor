import { icons } from '@/shared/config';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { RELEASES, selectOfferedUpdate, useUpdateStore } from '@/entities/app-update';
import { ReleaseNotes } from './ReleaseNotes';
import { UpdateCard } from './UpdateCard';

/** Like VS Code's release notes: what changed in this version and before, and a newer release when there is one. */
export function WhatsNewPage() {
  const info = useUpdateStore((s) => s.info);
  const state = useUpdateStore((s) => s.state);
  const offered = useUpdateStore(selectOfferedUpdate);

  return (
    <div className="h-full overflow-y-auto bg-surface-editor" data-testid="whats-new">
      <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-10">
        <header className="flex items-center gap-3.5">
          <span className="grid size-10 place-items-center rounded-xl text-accent-fg [background:var(--accent-grad)]">
            <Icon icon={icons.WhatsNewIcon} size={20} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-fg">What’s New</h1>
            <p className="text-[13px] text-fg-muted">
              Console Editor {info?.version ?? ''}
              {info?.updatedFrom ? ` · updated from ${info.updatedFrom}` : ''}
            </p>
          </div>
        </header>

        {offered ? <UpdateCard update={offered} state={state} /> : null}

        {RELEASES.length ? (
          RELEASES.map((entry) => <ReleaseNotes key={entry.version} entry={entry} installed={entry.version === info?.version} />)
        ) : (
          <EmptyState icon={icons.WhatsNewIcon} title="No release notes yet" className="mt-16">
            They appear here once a version is released.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
