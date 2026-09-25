import type { MatchType } from '@common/types';

/** What each match type does, beside its name in the menu. */
export const TYPE_HELP: Record<MatchType, string> = {
  exact: 'This exact URL',
  glob: '* matches anything',
  regex: 'JavaScript regular expression',
};

/** The fields' test ids are this prefix plus `-type` and `-pattern`, unless another is given. */
export const DEFAULT_TEST_ID_PREFIX = 'match';
