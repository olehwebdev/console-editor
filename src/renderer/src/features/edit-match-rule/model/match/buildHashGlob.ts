import { suggestHashGlob } from '@common/matcher';
import { fileName } from '@/shared/lib';

/** A glob that matches every build of a hash-named file, or null. */
export function buildHashGlob(sourceUrl: string): { glob: string; label: string } | null {
  const glob = suggestHashGlob(sourceUrl);
  return glob ? { glob, label: fileName(glob) } : null;
}
