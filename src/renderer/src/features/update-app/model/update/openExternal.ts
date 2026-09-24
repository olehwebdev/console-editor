import { api } from '@/shared/api';

export function openExternal(url: string): void {
  void api.openExternal(url).catch(() => undefined);
}
