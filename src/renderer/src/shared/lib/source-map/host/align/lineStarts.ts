import { LINE_FEED } from '../../constants';

/** The offset each line starts at. Generated lines break at \n only, as DevTools reads them (a CRLF's \r ends its line). */
export function lineStarts(text: string): Uint32Array {
  let count = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === LINE_FEED) count++;
  const starts = new Uint32Array(count);
  let line = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === LINE_FEED) starts[line++] = i + 1;
  return starts;
}
