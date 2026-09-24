import { ASKED } from './constants';
import type { PermissionDetails } from './types';

export function describePermission(permission: string, details: PermissionDetails): string {
  if ('mediaTypes' in details && details.mediaTypes?.length) {
    const types = details.mediaTypes.map((t) => (t === 'video' ? 'camera' : 'microphone'));
    return `use your ${types.join(' and ')}`;
  }
  return ASKED[permission] ?? permission;
}
