import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { reloadPage } from '@/features/navigate-page';
import type { AppEventOf } from '../types';
import { RULE_MISSED_TOAST_ID_PREFIX, RULE_MISSED_TOAST_MS } from './constants';

/** An enabled block rule matched a file the page received anyway: it was loading before the rule applied. */
export function warnRuleMissed(event: AppEventOf<'rule-missed'>): void {
  toast({
    id: `${RULE_MISSED_TOAST_ID_PREFIX}${event.ruleId}${event.url}`,
    title: `A rule didn't block ${fileName(event.url)}: it loaded before the rule applied`,
    tone: 'warning',
    action: { label: 'Reload page', onClick: () => void reloadPage() },
    duration: RULE_MISSED_TOAST_MS,
  });
}
