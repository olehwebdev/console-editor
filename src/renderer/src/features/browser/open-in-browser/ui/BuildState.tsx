import type { BrowserInfo } from '@common/types';
import { useBrowserStore } from '@/entities/browser';

/** How far a build's download is, or that it isn't downloaded yet, in place of its version. */
export function BuildState({ browser }: { browser: BrowserInfo }) {
  const download = useBrowserStore((s) => s.downloads[browser.id]);
  if (download) {
    const share = download.total ? `${Math.floor((download.done / download.total) * 100)}%` : `${Math.round(download.done / 1_048_576)} MB`;
    return <span className="shrink-0 font-mono text-[11px] text-accent" data-testid="browser-downloading">{share}</span>;
  }
  if (browser.build?.downloaded) return browser.version ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{browser.version}</span> : null;
  return <span className="shrink-0 text-[11px] text-fg-subtle">Download</span>;
}
