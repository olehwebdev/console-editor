import { api } from '@/shared/api';

/** Looks at every frame of the page again; what it finds arrives as `stack-changed`. */
export async function scanPageStack(): Promise<void> {
  await api.scanStacks();
}
