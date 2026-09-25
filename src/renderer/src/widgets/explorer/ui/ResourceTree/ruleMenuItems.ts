import type { ResourceEntry } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { useRuleStore } from '@/entities/rule';
import { openNewRule, openRuleEditor, RULE_SEEDS } from '@/features/edit-rule';
import { blockRequest, removeCspFrom } from '@/features/quick-rule';
import { setRuleEnabled } from '@/features/toggle-rule';

/** A file row's rule actions: unblock or block it, drop a document's CSP, or change its headers. */
export function ruleMenuItems(entry: ResourceEntry): MenuItem[] {
  const blockedBy = entry.blockedBy;
  const isDocument = entry.kind === 'Document';
  // The page's own document is never blocked; an iframe's is (by its parent).
  const isPage = isDocument && !entry.frame;
  return [
    ...(blockedBy
      ? [
          { label: 'Unblock (turn its rule off)', icon: icons.BlockIcon, onSelect: () => void setRuleEnabled(blockedBy, false) },
          {
            label: 'Edit blocking rule…',
            icon: icons.EditIcon,
            onSelect: () => {
              const rule = useRuleStore.getState().byId[blockedBy];
              if (rule) openRuleEditor(rule);
            },
          },
        ]
      : []),
    ...(!blockedBy && !isPage
      ? [{ label: entry.frame && isDocument ? 'Block this iframe' : 'Block this request', icon: icons.BlockIcon, danger: true, onSelect: () => void blockRequest(entry.url) }]
      : []),
    ...(isDocument ? [{ label: 'Remove Content-Security-Policy', icon: icons.HeadersIcon, onSelect: () => void removeCspFrom(entry.url) }] : []),
    { label: 'Change response headers…', icon: icons.HeadersIcon, onSelect: () => openNewRule(RULE_SEEDS.headers(entry.url)) },
  ];
}
