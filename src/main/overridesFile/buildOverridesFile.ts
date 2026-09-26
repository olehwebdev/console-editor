import { OVERRIDES_FILE_FORMAT, OVERRIDES_FILE_VERSION } from '../../shared/overrides';
import type { ExportedOverride, OverridesFile } from '../../shared/types';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import { exportedRuleOf } from './exportedRuleOf';


/** The active workspace's overrides and rules, as an export file holds them. */
export async function buildOverridesFile(store: OverrideStore, rules: RuleStore): Promise<OverridesFile> {
  const overrides: ExportedOverride[] = [];
  for (const o of store.list()) {
    const base = await store.base(o.id);
    overrides.push({
      kind: o.kind,
      sourceUrl: o.sourceUrl,
      match: o.match,
      enabled: o.enabled,
      originalHash: o.originalHash,
      ...(o.request ? { request: o.request } : {}),
      ...(o.response ? { response: o.response } : {}),
      content: o.content,
      // Diffs, and a response override patching the live response (what changed from it), need the base.
      ...(base !== o.content ? { base } : {}),
    });
  }
  return { format: OVERRIDES_FILE_FORMAT, version: OVERRIDES_FILE_VERSION, overrides, rules: rules.forRenderer().map(exportedRuleOf) };
}
