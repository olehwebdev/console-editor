import { CAPTURE_AREAS, SHOT_KINDS, type CaptureArea, type ShotKind } from '../../../shared/types';
import { isRecord } from '../isRecord';
import { MAX_SHOT_SIDE, SHOT_EXTENSIONS } from './constants';
import { cleanShotName } from './cleanShotName';
import type { ShotExtension, StoredShot } from './types';

const SHOT_ID = /^[0-9a-f]{8}$/;

/** A kept shot as it was written, or null when any field is off (it is then left out). */
export function sanitizeStoredShot(input: unknown): StoredShot | null {
  if (!isRecord(input)) return null;
  const side = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_SHOT_SIDE;
  const time = (value: unknown): value is number => Number.isFinite(value) && (value as number) >= 0;
  const text = (value: unknown): value is string => typeof value === 'string';
  const { id, workspaceId, kind, width, height, scale, ext, createdAt, updatedAt, area, pageUrl, group } = input;
  const name = cleanShotName(input.name);
  if (!text(id) || !SHOT_ID.test(id) || !text(workspaceId) || !name || !SHOT_KINDS.includes(kind as ShotKind)) return null;
  if (!side(width) || !side(height) || !(typeof scale === 'number' && scale > 0 && scale <= 16) || !SHOT_EXTENSIONS.includes(ext as ShotExtension)) return null;
  if (!time(createdAt) || !time(updatedAt)) return null;
  const browser = isRecord(input.browser) && text(input.browser.id) && text(input.browser.name) ? input.browser : null;
  const viewport = isRecord(input.viewport) && side(input.viewport.width) && side(input.viewport.height) ? input.viewport : null;
  return {
    id,
    workspaceId,
    kind: kind as ShotKind,
    name,
    width,
    height,
    scale,
    ext: ext as ShotExtension,
    pageUrl: text(pageUrl) ? pageUrl : null,
    browser: browser ? { id: browser.id as string, name: browser.name as string, version: text(browser.version) ? browser.version : null } : null,
    viewport: viewport ? { width: viewport.width as number, height: viewport.height as number } : null,
    area: CAPTURE_AREAS.includes(area as CaptureArea) ? (area as CaptureArea) : null,
    group: text(group) ? group : null,
    createdAt,
    updatedAt,
  };
}
