import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { PageController } from '../PageController';
import type { RuleStore } from '../store/RuleStore';
import { sanitizeRuleInput } from '../store/sanitizeRuleInput';
import { sanitizeRulePatch } from '../store/sanitizeRulePatch';
import { toRule } from '../store/toRule';
import { assertString } from './assertString';
import type { IpcHandle } from './types';

/** The rules' channels, for the editor UI. 'rules-changed' is sent before each reply resolves. */
export function registerRuleIpc(handle: IpcHandle, rules: RuleStore, page: PageController): void {
  handle(IPC_CHANNEL.listRules, () => rules.forRenderer());
  handle(IPC_CHANNEL.createRule, async (input: unknown) => {
    const created = await rules.create(sanitizeRuleInput(input));
    await page.rulesChanged();
    return toRule(created);
  });
  handle(IPC_CHANNEL.updateRule, async (id: unknown, patch: unknown) => {
    assertString(id, 'id');
    const clean = sanitizeRulePatch(patch);
    const updated = await rules.update(id, clean);
    // Only the matcher and on/off change Fetch patterns; request types and header edits are read at pause time.
    await page.rulesChanged(clean.match !== undefined || clean.enabled !== undefined);
    return toRule(updated);
  });
  handle(IPC_CHANNEL.deleteRule, async (id: unknown) => {
    assertString(id, 'id');
    await rules.remove(id);
    await page.rulesChanged();
  });
}
