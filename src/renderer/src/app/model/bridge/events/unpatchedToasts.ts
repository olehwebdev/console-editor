import type { UnpatchedReason } from '@common/types';

/** What the "couldn't patch" toast says for each reason: a new reason fails typecheck until it has copy. */
export const UNPATCHED_TOASTS: Record<UnpatchedReason, { title: (file: string) => string; description: string }> = {
  saved: {
    title: (file) => `Can't patch ${file}: your text isn't JSON`,
    description: 'Patch live applies what you changed in JSON, so the page got your text as it is. Fix the JSON, or turn Patch live off.',
  },
  live: {
    title: (file) => `Can't patch ${file}: the live response isn't JSON`,
    description: 'The page got your saved text instead.',
  },
  shape: {
    title: (file) => `Can't patch ${file}: the live response changed shape`,
    description: 'Something you edited is gone from it (or is another kind of value now), so the page got your saved text instead.',
  },
};
