import type { RenderCommit } from '@common/types';

/** What started a commit, in words: the event (`click on button#add`) and the store action right before it (`cart/added`). */
export function triggerLabel({ trigger, action }: Pick<RenderCommit, 'trigger' | 'action'>): string | null {
  const event = trigger ? (trigger.target ? `${trigger.type} on ${trigger.target}` : trigger.type) : null;
  const parts = [event, action?.type ?? null].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' → ') : null;
}
