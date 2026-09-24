import type { ResourceEntry } from '@common/types';
import { WEB_SCHEME } from './constants';

/** Tooltip text describing where a file was loaded. */
export function describeFrame(entry: ResourceEntry): string | null {
  if (!entry.frame) return null;
  const where = entry.frame.url.replace(WEB_SCHEME, '') || 'an iframe';
  if (entry.kind === 'Document' && entry.frame.url === entry.url) return `Document of ${entry.frame.depth > 1 ? 'a nested iframe' : 'an iframe'}`;
  return `Loaded in ${entry.frame.depth > 1 ? 'nested iframe' : 'iframe'} ${where}`;
}
