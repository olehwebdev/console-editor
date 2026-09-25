import { defaultMatcherFor } from '@common/matcher';
import { REMOVE_CSP_PRESET } from '@/entities/rule';
import { createQuickRule } from './createQuickRule';

/** Drops a page's (or an iframe's) Content-Security-Policy headers: its own document only. */
export function removeCspFrom(url: string): Promise<void> {
  return createQuickRule(
    { action: 'headers', match: defaultMatcherFor(url), resourceTypes: ['Document'], headers: REMOVE_CSP_PRESET.edits.map((edit) => ({ ...edit })) },
    'Content-Security-Policy removed',
  );
}
