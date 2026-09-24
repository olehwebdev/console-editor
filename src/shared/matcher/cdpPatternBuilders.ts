import type { MatchType } from '../types';
import { CDP_WILDCARD, GLOB_WILDCARD } from './constants';
import { escapeCdp } from './escapeCdp';
import type { CdpPatternBuilder } from './types';

/** How each match type becomes a CDP url pattern: a new MatchType fails typecheck until it has one. */
export const CDP_PATTERN_BUILDERS: Record<MatchType, CdpPatternBuilder> = {
  exact: (base, suffix) => escapeCdp(base) + suffix,
  glob: (base, suffix) => base.split(GLOB_WILDCARD).map(escapeCdp).join(CDP_WILDCARD) + suffix,
  // CDP patterns can't express a regular expression: every request is paused, and the matcher decides.
  regex: () => CDP_WILDCARD,
};
