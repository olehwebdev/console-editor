import { useInspectorStore } from '@/entities/inspector';
import { pageCommands } from '../commands/pageCommands';
import type { AppEventOf } from '../types';

/** Picking started or stopped; once it starts, the Inspect view shows what is under the pointer. */
export function showPicking(event: AppEventOf<'inspect-picking'>): void {
  useInspectorStore.getState().setPicking(event.picking);
  if (event.picking) pageCommands.current?.showInspect();
}
