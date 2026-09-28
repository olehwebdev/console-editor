import type { DesignImport, Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { reportImport } from './reportImport';

/** Keeps images dropped or pasted (files, or a pasted screenshot without a name) as designs; the notice says how it went. */
export async function addDesignFiles(files: readonly File[], onOpen: (shot: Shot) => void): Promise<void> {
  const result: DesignImport = { added: [], failed: [] };
  for (const file of files) {
    try {
      result.added.push(await api.addDesign(file.name, new Uint8Array(await file.arrayBuffer())));
    } catch (err) {
      result.failed.push({ name: file.name || 'image', reason: errorMessage(err) });
    }
  }
  reportImport(result, onOpen);
}
