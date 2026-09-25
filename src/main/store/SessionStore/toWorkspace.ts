import type { Workspace } from '../../../shared/types';
import { parseUrl } from '../../parseUrl';
import type { WorkspaceRecord } from '../types';

/** A workspace as the renderer sees it: its tile, without its page's tabs. */
export function toWorkspace(w: WorkspaceRecord): Workspace {
  return {
    id: w.id,
    name: w.name,
    host: parseUrl(w.url)?.host ?? '',
    title: w.title,
    icon: w.icon,
    color: w.color,
    frameNames: w.frameNames,
    breakpoints: w.breakpoints,
  };
}
