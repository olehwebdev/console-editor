import { randomBytes } from 'node:crypto';
import type { CreateOverrideInput, UrlMatcher } from '../../../shared/types';
import type { StoredOverride } from '../types';
import { ID_BYTES } from './constants';

/** A new, enabled override of workspace `workspaceId`, made now, under an id none in `taken` has. */
export function newOverride(input: CreateOverrideInput, match: UrlMatcher, workspaceId: string, taken: ReadonlyMap<string, unknown>): StoredOverride {
  let id: string;
  do id = randomBytes(ID_BYTES).toString('hex');
  while (taken.has(id));
  const now = Date.now();
  return {
    workspaceId,
    id,
    kind: input.kind,
    sourceUrl: input.sourceUrl,
    match,
    enabled: true,
    originalHash: input.originalHash,
    createdAt: now,
    updatedAt: now,
    content: input.content,
  };
}
