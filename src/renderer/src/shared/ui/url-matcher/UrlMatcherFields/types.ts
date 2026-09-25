import type { Ref } from 'react';
import type { UrlMatcher } from '@common/types';

export interface UrlMatcherFieldsProps {
  value: UrlMatcher;
  onChange(next: UrlMatcher): void;
  /** Enter in the pattern field. */
  onEnter?(): void;
  /** What is wrong with the pattern: shown under the fields, which then say the pattern is invalid. */
  error?: string;
  /** The pattern's <input> (a form focuses it when it is invalid). */
  patternRef?: Ref<HTMLInputElement>;
  /** Test ids are `${testIdPrefix}-type` and `${testIdPrefix}-pattern`. Default `match`. */
  testIdPrefix?: string;
  /** Focus the pattern field on mount. */
  autoFocus?: boolean;
}
