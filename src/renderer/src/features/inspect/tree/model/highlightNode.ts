import { api } from '@/shared/api';
import { useTreeStore } from '@/entities/inspector';

/** Highlights a node's first element in the page while the pointer is on its row; null hides it. */
export function highlightNode(path: number[] | null): void {
  const { frameId } = useTreeStore.getState();
  if (frameId) void api.highlightTreeNode(frameId, path).catch(() => undefined);
}
