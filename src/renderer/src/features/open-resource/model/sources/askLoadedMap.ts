import type { SourceMapKind } from '@common/types';
import { askSourceMapWorker, type SourceMapRequestOf, type SourceMapRequestType, type SourceMapWorkerReplies, type ViewRef } from '@/shared/lib';
import type { monaco } from '@/shared/monaco';
import { ensureSourceMap } from './ensureSourceMap';
import { isMiss } from './isMiss';

type Lookup = Exclude<SourceMapRequestType, 'load'>;

/**
 * Asks the worker about a loaded map, putting right what it may lack: the map itself (dropped while
 * idle or to make room: loaded again, once), and a new version of the tab's text (sent once, only
 * when asked for, so a jump doesn't copy a multi-MB bundle every time).
 */
export async function askLoadedMap<T extends Lookup>(
  request: SourceMapRequestOf<T>,
  context: { kind: SourceMapKind; model?: monaco.editor.ITextModel },
): Promise<SourceMapWorkerReplies[T]> {
  // Every lookup names its bundle (TypeScript can't see that through the generic).
  const { bundleUrl } = request as { bundleUrl: string };
  let reply = await askSourceMapWorker<T>(request);
  if (isMiss(reply, 'unloaded')) {
    const state = await ensureSourceMap(bundleUrl, context.kind, { reload: true });
    if (state.status !== 'ready') return reply;
    reply = await askSourceMapWorker<T>(request);
  }
  const view = (request as { view?: ViewRef }).view;
  if (isMiss(reply, 'need-view') && view && context.model && !context.model.isDisposed()) {
    reply = await askSourceMapWorker<T>({ ...request, view: { ...view, text: context.model.getValue() } });
  }
  return reply;
}
