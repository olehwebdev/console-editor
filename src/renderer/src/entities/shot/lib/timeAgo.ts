import { JUST_NOW, TIME_UNITS } from './constants';

/** How long ago `time` was, in its largest whole unit: `15 h ago`, `2 days ago`, `just now`. */
export function timeAgo(time: number, now: number): string {
  const elapsed = Math.max(0, now - time);
  const unit = TIME_UNITS.find((u) => elapsed >= u.ms);
  if (!unit) return JUST_NOW;
  const count = Math.floor(elapsed / unit.ms);
  return `${count} ${count === 1 ? unit.one : unit.many} ago`;
}
