import type { SourceMapKind } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { SCRIPT_KIND } from './constants';
import { relocateBundle } from './relocateBundle';

/** Asks for a source map file for a bundle and uses it in place of the bundle's own, from now on in this workspace. True once it is. */
export async function loadMapFile(bundleUrl: string, kind: SourceMapKind = SCRIPT_KIND): Promise<boolean> {
  try {
    if (!(await api.loadSourceMapFile(bundleUrl))) return false;
  } catch (err) {
    toast({ title: "Couldn't load that source map", description: errorMessage(err), tone: 'danger' });
    return false;
  }
  await relocateBundle(bundleUrl, kind);
  return true;
}
