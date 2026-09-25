import type { RenderTrigger } from '@common/types';

/** What started a commit, in words: `click on button#add`; null when nothing did (a timer, a request coming back, the first render). */
export function triggerLabel(trigger: RenderTrigger | null): string | null {
  if (!trigger) return null;
  return trigger.target ? `${trigger.type} on ${trigger.target}` : trigger.type;
}
