import type { CodeLocation } from '@common/types';
import { fileName } from '@/shared/lib';
import type { OriginalPlace } from '../model/store';

/** Where a function is, as a short label: its original's file and line, else the bundle's (1-based, as served). */
export function codeLabel(location: CodeLocation, origin: OriginalPlace | null | undefined): string {
  return origin ? `${fileName(origin.url)}:${origin.line}` : `${fileName(location.url)}:${location.line + 1}`;
}
