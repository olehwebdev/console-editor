import { monaco, READ_ONLY_URI_AUTHORITY } from '@/shared/monaco';
import { entries } from './entries';

/** Monaco's scheme for models that aren't files on disk. */
const SOURCE_URI_SCHEME = 'inmemory';

/**
 * Creates a read-only original's model (the editor reads read-only from its URI). Its path ends in the
 * original's file name, so the TypeScript worker parses a .tsx as TSX. It has no dirty tracking.
 */
export function createSourceModel(tabId: string, fileLabel: string, language: string, text: string): void {
  const uri = monaco.Uri.from({ scheme: SOURCE_URI_SCHEME, authority: READ_ONLY_URI_AUTHORITY, path: `/${tabId}/${fileLabel}` });
  const model = monaco.editor.createModel(text, language, uri);
  entries.set(tabId, { model, savedVersionId: model.getAlternativeVersionId() });
}
