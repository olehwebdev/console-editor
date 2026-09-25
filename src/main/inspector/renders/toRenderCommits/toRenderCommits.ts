import { RENDER_KINDS, RENDER_REASONS } from '../../../../shared/types';
import { MAX_COMMIT_BATCH, MAX_RENDERED, MAX_TEXT_LENGTH } from '../../constants';
import { cleanText } from '../../reading/cleanText';
import { countOf } from './countOf';
import { itemsOf } from './itemsOf';
import { timeOf } from './timeOf';
import { toActionTrigger } from './toActionTrigger';
import { toReason } from './toReason';
import type { Item, PageCommit } from './types';

/** The page's batch of commits (the binding's payload, JSON), checked like any input from the page. */
export function toRenderCommits(payload: string): PageCommit[] {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return [];
  }
  return itemsOf(raw, MAX_COMMIT_BATCH).map((commit) => {
    const trigger = commit.trigger && typeof commit.trigger === 'object' ? (commit.trigger as Item) : null;
    return {
      at: timeOf(commit.at) ?? Date.now(),
      duration: timeOf(commit.duration),
      trigger: trigger && typeof trigger.type === 'string' ? { type: cleanText(trigger.type).slice(0, MAX_TEXT_LENGTH), target: typeof trigger.target === 'string' ? cleanText(trigger.target) : null } : null,
      action: toActionTrigger(commit.action),
      components: itemsOf(commit.components, MAX_RENDERED).flatMap((c) => {
        const kind = RENDER_KINDS.find((k) => k === c.kind);
        const type = typeof c.type === 'number' && Number.isInteger(c.type) && c.type >= 0 ? c.type : -1;
        if (!kind) return [];
        const reasons = itemsOf(c.reasons, RENDER_REASONS.length).flatMap(toReason);
        return [{ name: cleanText(c.name), key: typeof c.key === 'string' ? cleanText(c.key) : null, kind, memo: c.memo === true, duration: timeOf(c.duration), reasons, type }];
      }),
      more: countOf(commit.more),
    };
  });
}
