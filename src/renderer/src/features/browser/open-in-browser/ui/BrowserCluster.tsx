import type { BrowserInfo } from '@common/types';
import { BrowserIcon } from '@/entities/browser';
import { CLUSTER_ICON, CLUSTER_SIZE } from './constants';

/** Up to four browsers' icons in a 2×2 grid, as the button beside the address bar shows them; the rest of the grid dashed rings. */
export function BrowserCluster({ browsers }: { browsers: BrowserInfo[] }) {
  const shown = browsers.slice(0, CLUSTER_SIZE);
  return (
    <span className="grid grid-cols-2 gap-px" aria-hidden>
      {shown.map((browser) => (
        <BrowserIcon key={browser.id} browser={browser} size={CLUSTER_ICON} />
      ))}
      {Array.from({ length: CLUSTER_SIZE - shown.length }, (_, i) => (
        <span key={i} className="size-2.5 rounded-full border border-dashed border-fg-subtle" />
      ))}
    </span>
  );
}
