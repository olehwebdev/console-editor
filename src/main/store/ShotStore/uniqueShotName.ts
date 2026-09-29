import { extname } from 'node:path';

/** `name`, or with `-2`, `-3`… before its extension when another of `taken` has it. */
export function uniqueShotName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let n = 2; ; n++) {
    const next = `${stem}-${n}${ext}`;
    if (!taken.has(next)) return next;
  }
}
