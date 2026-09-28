import type { Shot } from '@common/types';
import { KIND_LABEL } from './constants';
import { timeAgo } from './timeAgo';

/**
 * A shot's line under its name: its kind, the browser a capture was taken in and its major version (the app's own
 * page is Chromium's), its viewport or a design's width in CSS pixels, and its age.
 */
export function shotDetail(shot: Shot, now: number): string {
  const { browser, viewport } = shot;
  const major = browser?.version?.split('.')[0];
  const where = browser ? `${browser.name}${major ? ` ${major}` : ''}` : null;
  const size = viewport ? `${viewport.width} × ${viewport.height}` : `${Math.round(shot.width / shot.scale)} wide`;
  return [KIND_LABEL[shot.kind], where, size, timeAgo(shot.createdAt, now)].filter(Boolean).join(' · ');
}
