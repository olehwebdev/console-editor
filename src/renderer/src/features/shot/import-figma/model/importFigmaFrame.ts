import type { FigmaImport, Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';

/** Brings a Figma frame in as a design: the shot, or why it couldn't be (for the form to show). */
export async function importFigmaFrame(input: FigmaImport): Promise<{ shot: Shot } | { error: string }> {
  try {
    return { shot: await api.importFigmaFrame(input) };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
