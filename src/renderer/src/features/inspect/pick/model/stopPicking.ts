import { api } from '@/shared/api';

/** Takes the page out of inspect mode. */
export async function stopPicking(): Promise<void> {
  await api.stopPicking();
}
