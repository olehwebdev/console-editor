import type { AvailableUpdate, UpdateState } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Markdown } from '@/shared/ui/markdown';
import { openExternal } from '../../model/update';
import { CARD_ICON_SIZE } from './constants';
import { UpdateStep } from './UpdateStep';

/** The offered release: its notes, and the next step (download, progress, restart). */
export function UpdateCard({ update, state }: { update: AvailableUpdate; state: UpdateState }) {
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
          <Icon icon={icons.ExternalLinkIcon} size={CARD_ICON_SIZE} />
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
