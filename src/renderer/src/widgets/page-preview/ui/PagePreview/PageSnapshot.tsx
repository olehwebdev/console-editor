import { CAPTURE_FAILED } from './constants';
import type { Snapshot } from './types';

/** What covers the host while the page is frozen: the still once captured, or a blank surface if capturing failed. */
export function PageSnapshot({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot === CAPTURE_FAILED) return <div aria-hidden className="absolute inset-0 bg-surface-raised" />;
  return snapshot ? (
    <img src={snapshot} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left-top" />
  ) : null;
}
