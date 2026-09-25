/** Characters the Desktop Entry spec reserves inside a quoted Exec argument: each is escaped with a backslash. */
const QUOTED_RESERVED = /["`$\\]/g;

/** Exec's field codes start with a percent sign, so a literal one is written twice. */
const PERCENT = /%/g;

/** One argument of a desktop entry's Exec key, quoted so spaces and shell characters in it stay literal. */
export function quoteExecArgument(arg: string): string {
  return `"${arg.replace(QUOTED_RESERVED, '\\$&').replace(PERCENT, '%%')}"`;
}
