/** An environment assignment before the program (`env A=1 firefox`). */
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const ENV = 'env';

/** The program a launcher's command runs: past `env` and its variable assignments. */
export function programOf(command: string[]): string | null {
  let i = 0;
  if (command[i] === ENV) i++;
  while (i < command.length && ASSIGNMENT.test(command[i])) i++;
  return command[i] ?? null;
}
