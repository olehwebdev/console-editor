import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Forgets the Figma token kept; true once it is gone. */
export async function forgetFigmaToken(): Promise<boolean> {
  try {
    await api.forgetFigmaToken();
    return true;
  } catch (err) {
    toast({ title: 'Could not forget your Figma token', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
