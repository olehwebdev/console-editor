import { api } from '@/shared/api';
import { useInspectorStore } from '@/entities/inspector';

/** Starts picking an element in the page, or stops; the main process says which it is doing (`inspect-picking`). */
export async function togglePicking(): Promise<void> {
  await (useInspectorStore.getState().picking ? api.stopPicking() : api.startPicking());
}
