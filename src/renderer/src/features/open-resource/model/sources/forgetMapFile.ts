import type { SourceMapKind } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { SCRIPT_KIND } from './constants';
import { relocateBundle } from './relocateBundle';

/** Forgets the map loaded from a file for a bundle: its own (if any) is used again. */
export async function forgetMapFile(bundleUrl: string, kind: SourceMapKind = SCRIPT_KIND): Promise<void> {
  try {
    await api.forgetSourceMapFile(bundleUrl);
  } catch (err) {
    toast({ title: "Couldn't forget that source map", description: errorMessage(err), tone: 'danger' });
    return;
  }
  await relocateBundle(bundleUrl, kind);
}
