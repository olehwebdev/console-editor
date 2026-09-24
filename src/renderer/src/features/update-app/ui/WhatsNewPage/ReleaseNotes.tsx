import type { ChangelogEntry } from '@common/changelog';
import { Badge } from '@/shared/ui/badge';
import { Markdown } from '@/shared/ui/markdown';
import { openExternal } from '../../model/update';
import { formatDate } from './formatDate';

export function ReleaseNotes({ entry, installed }: { entry: ChangelogEntry; installed: boolean }) {
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
