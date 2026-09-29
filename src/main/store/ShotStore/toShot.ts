import type { Shot } from '../../../shared/types';
import type { StoredShot } from './types';

/** What the UI is told of a shot: never its workspace or file type. */
export function toShot({ workspaceId: _workspaceId, ext: _ext, ...shot }: StoredShot): Shot {
  return shot;
}
