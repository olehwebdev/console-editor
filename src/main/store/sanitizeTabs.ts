import { RESOURCE_KINDS, type ResourceKind, type SessionTab } from '../../shared/types';
import { TAB_ID } from './constants';
import { pendingResponse } from './pendingResponse';

const MAX_TABS = 200;

/** Keeps only well-formed tabs, so a corrupt file or a bad message can't inject junk. */
export function sanitizeTabs(input: unknown): SessionTab[] {
  if (!Array.isArray(input)) return [];
  const tabs: SessionTab[] = [];
  for (const t of input.slice(0, MAX_TABS) as Array<Partial<SessionTab>>) {
    if (!t || typeof t.id !== 'string' || !TAB_ID.test(t.id) || typeof t.url !== 'string' || !RESOURCE_KINDS.includes(t.kind as ResourceKind)) continue;
    tabs.push({
      id: t.id,
      url: t.url,
      kind: t.kind as ResourceKind,
      ...(typeof t.overrideId === 'string' ? { overrideId: t.overrideId } : {}),
      originalHash: typeof t.originalHash === 'string' ? t.originalHash : null,
      ...pendingResponse(t),
    });
  }
  return tabs;
}
