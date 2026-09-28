/** Characters a backslash escapes inside a quoted Exec argument. */
const QUOTED_ESCAPES = new Set(['"', '`', '$', '\\']);

/**
 * An Exec value's arguments, as the Desktop Entry spec quotes them: split on spaces outside double quotes, and inside
 * them a backslash escapes `"`, `` ` ``, `$` and `\`.
 */
export function splitExec(exec: string): string[] {
  const args: string[] = [];
  let current = '';
  let quoted = false;
  let started = false;
  for (let i = 0; i < exec.length; i++) {
    const c = exec[i];
    if (quoted && c === '\\' && QUOTED_ESCAPES.has(exec[i + 1])) {
      current += exec[++i];
    } else if (c === '"') {
      quoted = !quoted;
      started = true;
    } else if (!quoted && (c === ' ' || c === '\t')) {
      if (started) args.push(current);
      current = '';
      started = false;
    } else {
      current += c;
      started = true;
    }
  }
  if (started) args.push(current);
  return args;
}
