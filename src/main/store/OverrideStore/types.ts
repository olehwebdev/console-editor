import type { OverrideMeta } from '../../../shared/types';

export interface IndexFile {
  version: number;
  /** `workspaceId` is missing from overrides saved before workspaces existed. */
  overrides: Array<OverrideMeta & { workspaceId?: string }>;
}

/** An override's files: the content that gets served, and the one editing started from. */
export type ContentFile = 'content' | 'base';

/** What names an override's files: its id, and its kind for the extension. */
export type FileOwner = Pick<OverrideMeta, 'id' | 'kind'>;
