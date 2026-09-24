import type { ResourceKind } from '@common/types';
import { LANGUAGES, LARGE_FILE_CHARS } from './constants';

export function languageFor(kind: ResourceKind, length: number): string {
  return length >= LARGE_FILE_CHARS ? LANGUAGES[kind].lite : LANGUAGES[kind].full;
}
