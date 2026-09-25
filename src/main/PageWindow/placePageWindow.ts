import type { Rectangle } from 'electron';
import { DEFAULT_WINDOW_SIZE, MAX_SCREEN_SHARE, MIN_VISIBLE_PX } from './constants';

/**
 * Where the website's own window opens, given its saved bounds, the screens'
 * work areas and the editor window's bounds. Saved bounds are kept while
 * enough of them is on some screen (a screen may have been unplugged since).
 * Otherwise the window goes to a screen other than the editor's when there is
 * one, which is what it is for, else to the editor's, centred.
 */
export function placePageWindow(saved: Rectangle | undefined, screens: readonly Rectangle[], editor: Rectangle): Rectangle {
  const visibleOn = (area: Rectangle, r: Rectangle) =>
    Math.min(r.x + r.width, area.x + area.width) - Math.max(r.x, area.x) >= MIN_VISIBLE_PX &&
    Math.min(r.y + r.height, area.y + area.height) - Math.max(r.y, area.y) >= MIN_VISIBLE_PX;
  if (saved && screens.some((area) => visibleOn(area, saved))) return saved;

  const cx = editor.x + editor.width / 2;
  const cy = editor.y + editor.height / 2;
  const holdsEditor = (area: Rectangle) => cx >= area.x && cx < area.x + area.width && cy >= area.y && cy < area.y + area.height;
  const area = screens.find((a) => !holdsEditor(a)) ?? screens.find(holdsEditor) ?? screens[0] ?? editor;
  const width = Math.round(Math.min(DEFAULT_WINDOW_SIZE.width, area.width * MAX_SCREEN_SHARE));
  const height = Math.round(Math.min(DEFAULT_WINDOW_SIZE.height, area.height * MAX_SCREEN_SHARE));
  return { x: Math.round(area.x + (area.width - width) / 2), y: Math.round(area.y + (area.height - height) / 2), width, height };
}
