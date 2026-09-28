import type { Shot } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { useShotStore } from '@/entities/shot';

/**
 * Takes the workspace's shots as announced: pages of shots gone close (and comparisons with one), and renamed ones
 * take their new name.
 */
export function receiveShots(shots: Shot[]): void {
  useShotStore.getState().setAll(shots);
  const tabs = useTabStore.getState();
  const byId = new Map(shots.map((s) => [s.id, s]));
  const pages = tabs.pages.filter((p) => p.page === 'shot');
  const compares = tabs.pages.filter((p) => p.page === 'compare');
  tabs.removePages([...pages.filter((p) => !byId.has(p.shotId)), ...compares.filter((p) => !byId.has(p.baseId) || !byId.has(p.otherId))].map((p) => p.id));
  for (const page of pages) {
    const shot = byId.get(page.shotId);
    if (shot && shot.name !== page.title) tabs.retitlePage(page.id, shot.name);
  }
}
