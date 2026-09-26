import { ruleInputSchema, sameRuleInput } from '../../shared/rules';
import type { CreateRuleInput, OverridesImport } from '../../shared/types';
import { isRecord } from '../store/isRecord';
import { parseInput } from '../store/parseInput';
import type { RuleStore } from '../store/RuleStore';

/**
 * Adds an export's rules to the active workspace, counting into `counts`: none that one of its own
 * already does, and none that can't be read. A store that refuses one (the workspace is full) stops it.
 */
export async function importRules(rules: RuleStore, entries: readonly unknown[], counts: OverridesImport): Promise<void> {
  for (const entry of entries) {
    let input: CreateRuleInput;
    try {
      input = parseInput(ruleInputSchema, entry, 'rule');
    } catch {
      counts.unreadable++;
      continue;
    }
    if (rules.forRenderer().some((rule) => sameRuleInput(rule, input))) {
      counts.present++;
      continue;
    }
    const created = await rules.create(input);
    if (isRecord(entry) && entry.enabled === false) await rules.update(created.id, { enabled: false });
    counts.rules++;
  }
}
