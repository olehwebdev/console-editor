import type { FileKind } from '../../../shared/types';
import { FILE_KINDS } from '../../../shared/types';

/** Whether a CDP resource type is one of the file kinds we list (and answer only with an override of that kind). */
export function isKind(type: string | undefined): type is FileKind {
  return !!type && (FILE_KINDS as readonly string[]).includes(type);
}
