import type { UrlMatcher } from '@common/types';

export interface UrlMatcherFieldsProps {
  value: UrlMatcher;
  onChange(next: UrlMatcher): void;
  /** Enter in the pattern field. */
  onEnter?(): void;
  /** Test ids are `${testIdPrefix}-type` and `${testIdPrefix}-pattern`. Default `match`. */
  testIdPrefix?: string;
  /** Focus the pattern field on mount. */
  autoFocus?: boolean;
}
