import { defaultMatcherFor } from '@common/matcher';
import { fileName } from '@/shared/lib';
import { createQuickRule } from './createQuickRule';

/** Blocks one file: its URL, any query. */
export function blockRequest(url: string): Promise<void> {
  return createQuickRule({ action: 'block', match: defaultMatcherFor(url), resourceTypes: [] }, `Blocked ${fileName(url)}`);
}
