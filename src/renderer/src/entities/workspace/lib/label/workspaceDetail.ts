import type { Workspace } from '@common/types';

/** What tells it apart when the label doesn't: the page's title, or its host when it has a name. */
export function workspaceDetail(w: Pick<Workspace, 'name' | 'host' | 'title'>): string {
  return w.title || (w.name.trim() ? w.host : '');
}
