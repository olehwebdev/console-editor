import type { InspectedComponent } from '@common/types';
import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { parseSourceUrl } from '@/entities/source-map';
import { openCode, revealBundleCode } from '@/features/open-resource';
import { ORIGIN_NOTE } from './constants';
import { MapFileButton } from './MapFileButton';
import { originStatus } from './originStatus';

/** Where the component is defined: its original through the bundle's map, else the bundle's code, with the ways to go there. */
export function SourceCard({ component }: { component: InspectedComponent }) {
  const location = component.chain[component.depth]?.location ?? null;
  const origin = useInspectorStore((s) => (location ? s.origins[locationKey(location)] : undefined));
  if (!location) return <p className="text-[13px] text-fg-subtle">Where it is defined isn't known: V8 gave no place for its function.</p>;
  const source = origin && parseSourceUrl(origin.url);
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3" data-testid="component-source">
      <div className="flex min-w-0 items-center gap-2">
        <Icon icon={origin ? icons.SourceFileIcon : icons.JsIcon} size={16} className="shrink-0 text-info" />
        <span className="min-w-0 truncate font-mono text-[13px] text-fg" title={origin?.url ?? location.url} data-testid="component-source-place">
          {source ? `${[...source.dirs, source.file].join('/')}:${origin.line}` : `${fileName(location.url)}:${location.line + 1}:${location.column + 1}`}
        </span>
      </div>
      <p className="text-[12px] text-fg-muted">{origin ? `From the source map of ${fileName(origin.bundleUrl)}.` : ORIGIN_NOTE[originStatus(origin) as keyof typeof ORIGIN_NOTE]}</p>

      <div className="flex flex-wrap gap-2">
        {origin ? (
          <Button size="sm" variant="secondary" onClick={() => openCode(location, origin)} data-testid="open-original">
            Open original
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" onClick={() => void revealBundleCode(location, origin?.rawOffset ?? null)} data-testid="go-to-bundle">
          Go to bundle code
        </Button>
        {origin !== undefined ? <MapFileButton bundleUrl={location.url} mapped={!!origin} /> : null}
      </div>
    </section>
  );
}
