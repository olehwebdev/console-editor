import type { Workspace } from '@common/types';

/** What a workspace's label is made from. */
export type Named = Pick<Workspace, 'name' | 'host'>;
