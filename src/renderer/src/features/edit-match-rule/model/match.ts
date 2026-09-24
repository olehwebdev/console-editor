import { compileMatcher, suggestHashGlob, validateMatcher } from '@common/matcher';
import type { UrlMatcher } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';

/** Changes which URLs an override applies to. Invalid patterns are rejected; ones that miss the source URL need confirmation. */
export async function applyMatch(id: string, match: UrlMatcher): Promise<boolean> {
  const error = validateMatcher(match);
  if (error) {
    toast({ title: 'Invalid pattern', description: error, tone: 'danger' });
    return false;
  }
  const meta = useOverrideStore.getState().byId[id];
  if (meta && !compileMatcher(match)(meta.sourceUrl)) {
    const ok = await confirm({
      title: 'The pattern no longer matches this file',
      body: `It won't apply to ${meta.sourceUrl}. Save it anyway?`,
      confirmLabel: 'Save pattern',
    });
    if (!ok) return false;
  }
  try {
    useOverrideStore.getState().upsert(await api.updateOverride(id, { match }));
    toast({ title: 'Match rule updated', description: `${match.type}: ${match.pattern}`, tone: 'success', duration: 2500 });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
    return true;
  } catch (err) {
    toast({ title: 'Could not update the match rule', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}

/** A glob that matches every build of a hash-named file, or null. */
export function buildHashGlob(sourceUrl: string): { glob: string; label: string } | null {
  const glob = suggestHashGlob(sourceUrl);
  return glob ? { glob, label: fileName(glob) } : null;
}
