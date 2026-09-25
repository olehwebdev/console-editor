import type { MissReason } from '@/shared/lib';
import type { ToastTone } from '@/shared/ui/toast';
import type { MissContext } from './types';

/** What a toast says when a jump can't be made: a new reason fails typecheck until it has words. */
export const MISS_TEXT: Record<MissReason, (context: MissContext) => { title: string; description?: string; tone: ToastTone }> = {
  unloaded: ({ bundle }) => ({ title: `The source map of ${bundle} is no longer loaded`, description: 'Try again.', tone: 'warning' }),
  'need-view': ({ bundle }) => ({ title: `Couldn't line ${bundle} up with its source map`, tone: 'warning' }),
  'no-bundle': ({ bundle }) => ({
    title: `${bundle} is too large to line up with its source map`,
    description: 'You can browse its original files, not jump between them and the bundle.',
    tone: 'neutral',
  }),
  'unknown-source': ({ bundle, file }) => ({ title: `${bundle}'s source map no longer lists ${file}`, tone: 'warning' }),
  'no-content': ({ file, line }) => ({ title: `Maps to ${file}${line ? ` line ${line}` : ''}`, description: "The source map doesn't include that file's text.", tone: 'neutral' }),
  unmapped: () => ({ title: 'No original code maps here', description: 'Bundlers add code of their own (module loaders, helpers).', tone: 'neutral' }),
  edited: ({ bundle, cause }) =>
    cause === 'changed'
      ? { title: `${bundle} changed since its source map was loaded`, description: 'This code has no original in its source map.', tone: 'warning' }
      : { title: 'This is code you changed', description: 'Your edits have no original.', tone: 'warning' },
  'no-code-near': ({ bundle, file, line }) => ({
    title: `${file} has no code in ${bundle} near line ${line}`,
    description: 'Types, comments and code the build removed have none.',
    tone: 'neutral',
  }),
  'outside-bundle': ({ bundle }) => ({
    title: `This source map may not match ${bundle}`,
    description: 'Some of its positions fall outside the file (a different build?).',
    tone: 'warning',
  }),
};
