import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { reportImport } from './reportImport';

/** Asks for design images with the system's dialog and keeps them with the workspace; the notice says how it went. */
export async function importDesigns(onOpen: (shot: Shot) => void): Promise<void> {
  try {
    reportImport(await api.importDesigns(), onOpen);
  } catch (err) {
    toast({ title: 'Could not import designs', description: errorMessage(err), tone: 'danger' });
  }
}
