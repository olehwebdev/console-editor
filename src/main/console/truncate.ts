import { ELLIPSIS } from './constants';

/** `text`, cut to `max` characters with an ellipsis when longer. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}${ELLIPSIS}` : text;
}
