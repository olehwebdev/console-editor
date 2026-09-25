import type { Rule } from '../../shared/types';
import type { StoredRule } from './types';

/** A rule as the renderer sees it: without its workspace. */
export function toRule({ workspaceId: _workspaceId, ...rule }: StoredRule): Rule {
  return rule;
}
