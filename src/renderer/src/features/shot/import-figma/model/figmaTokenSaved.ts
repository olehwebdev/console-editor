import { api } from '@/shared/api';

/** Whether a Figma token is kept (none, when that can't be told: the form then asks for one). */
export async function figmaTokenSaved(): Promise<boolean> {
  return api.hasFigmaToken().catch(() => false);
}
