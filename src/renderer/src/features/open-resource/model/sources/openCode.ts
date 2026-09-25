import type { CodeLocation } from '@common/types';
import type { OriginalPlace } from '@/entities/inspector';
import { SCRIPT_KIND } from './constants';
import { openOriginalSource } from './openOriginalSource';
import { revealBundleCode } from './revealBundleCode';

/** Opens where a function is defined: its original, read-only, when the bundle's map has it; else the bundle's code. */
export function openCode(location: CodeLocation, origin: OriginalPlace | null | undefined): void {
  if (origin) void openOriginalSource(origin.bundleUrl, SCRIPT_KIND, origin.url, { reveal: { lineNumber: origin.line, column: origin.column } });
  else void revealBundleCode(location, null);
}
