import { SOURCE_KEY_SEPARATOR } from '../constants';
import { KEY_TAG } from './constants';
import type { NestInput, SourceRow, SourceStatus } from './types';

/** A nest that shows one line of text instead of files. */
export function statusRow({ bundleUrl, bundleKind, parentKey, depth }: NestInput, status: SourceStatus, message: string): SourceRow[] {
  return [{ type: 'source-status', key: `${parentKey}${SOURCE_KEY_SEPARATOR}${KEY_TAG.status}`, depth, bundleUrl, bundleKind, status, message }];
}
