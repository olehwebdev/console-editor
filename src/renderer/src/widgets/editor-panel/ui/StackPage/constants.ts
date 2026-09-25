import type { StackBuild, StackCategory } from '@common/stackLibraries';
import type { BadgeTone } from '@/shared/ui/badge';

/** What each kind of finding is called in a frame's card. */
export const CATEGORY_LABEL: Record<StackCategory, string> = {
  ui: 'UI library',
  meta: 'Framework',
  state: 'State',
  bundler: 'Bundler',
};

/** A development build stands out: it names things, and runs slower. */
export const BUILD_TONE: Record<StackBuild, BadgeTone> = {
  production: 'neutral',
  development: 'warning',
};
