import { useShotStore } from '@/entities/shot';
import { openShot } from './openShot';

/** Opens the page of a shot the website's own window asked for, once the editor knows of it. */
export function showShotById(id: string): void {
  const shot = useShotStore.getState().shots.find((s) => s.id === id);
  if (shot) openShot(shot);
}
