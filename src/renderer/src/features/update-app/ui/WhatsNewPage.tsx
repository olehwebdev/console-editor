import type { AvailableUpdate, UpdateState } from '@common/types';
import type { ChangelogEntry } from '@common/changelog';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { Markdown } from '@/shared/ui/markdown';
import { RELEASES, selectOfferedUpdate, useUpdateStore } from '@/entities/app-update';
import { availableHint, downloadLabel, downloadUpdate, installUpdate, manualInstallHint, openExternal } from '../model/update';

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** The offered release: its notes, and the next step (download, progress, restart). */
function UpdateCard({ update, state }: { update: AvailableUpdate; state: UpdateState }) {
  return (
    <section
      className="mt-8 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[var(--elevation-raised)]"
      aria-label={`Version ${update.version}`}
      data-testid="update-card"
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="size-2 rounded-full bg-accent" />
        <h2 className="flex-1 text-[14px] font-medium text-fg">Version {update.version} is available</h2>
        <button
          type="button"
          onClick={() => openExternal(update.releaseUrl)}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          Release page
          <Icon icon={icons.ExternalLinkIcon} size={12} />
        </button>
      </div>
      <div className="px-5 py-4">
        {update.notes ? (
          <Markdown source={update.notes} onOpenLink={openExternal} />
        ) : (
          <p className="text-[13px] text-fg-muted">The release page lists what changed.</p>
        )}
      </div>
      <div className="flex min-h-12 items-center gap-3 border-t border-line bg-canvas/40 px-5 py-2.5">
        <UpdateStep update={update} state={state} />
      </div>
    </section>
  );
}

function UpdateStep({ update, state }: { update: AvailableUpdate; state: UpdateState }) {
  if (state.status === 'downloading') {
    return (
      <div className="flex flex-1 items-center gap-3">
        <span className="text-[12.5px] text-fg-muted" aria-hidden>
          Downloading… {state.percent}%
        </span>
        {/* A progress bar rather than live text, which would be read out at every percent. */}
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-hover"
          role="progressbar"
          aria-label="Downloading the update"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.percent}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${state.percent}%` }} />
        </div>
      </div>
    );
  }
  if (state.status === 'ready') {
    return update.install === 'auto' ? (
      <>
        <span className="flex-1 text-[12.5px] text-fg-muted">
          Downloaded.{update.installsOnQuit ? '' : ' Restarting asks for your password.'} Unsaved edits are kept as drafts across the restart.
        </span>
        <Button variant="primary" size="sm" leading={<Icon icon={icons.ReloadIcon} size={12} />} onClick={installUpdate}>
          Restart to update
        </Button>
      </>
    ) : (
      <>
        <span className="flex-1 text-[12.5px] text-fg-muted">{manualInstallHint(state.file)}</span>
        <Button size="sm" onClick={installUpdate}>
          {state.file?.endsWith('.dmg') ? 'Open again' : 'Show file'}
        </Button>
      </>
    );
  }
  // After a failed download or install, the same button tries again; a failed check changes nothing here.
  const retry = state.status === 'error' && state.during !== 'check';
  return (
    <>
      <span className={cn('flex-1 text-[12.5px]', state.status === 'error' ? 'text-danger' : 'text-fg-muted')} role={state.status === 'error' ? 'alert' : undefined}>
        {state.status === 'error'
          ? state.message
          : update.install === 'auto'
            ? availableHint(update)
            : 'The download is checked against the release’s SHA-256 checksums.'}
      </span>
      <Button variant="primary" size="sm" leading={<Icon icon={icons.DownloadIcon} size={12} />} onClick={downloadUpdate}>
        {retry ? 'Try again' : downloadLabel(update)}
      </Button>
    </>
  );
}

function ReleaseNotes({ entry, installed }: { entry: ChangelogEntry; installed: boolean }) {
  return (
    <section className="mt-10 border-t border-line pt-8" aria-label={`Version ${entry.version}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-fg">{entry.version}</h2>
        {formatDate(entry.date) ? <span className="text-[12.5px] text-fg-subtle">{formatDate(entry.date)}</span> : null}
        {installed ? (
          <Badge tone="live" dot>
            Installed
          </Badge>
        ) : null}
      </div>
      <Markdown source={entry.body} onOpenLink={openExternal} />
    </section>
  );
}

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
