import { BROWSER_ID_PREFIX } from '../../constants';
import { engineOf } from '../../engineOf';
import { runProgram } from '../../runProgram';
import type { FoundBrowser } from '../../types';
import { DEFAULT_VALUE, OPEN_COMMAND_KEY, REG, START_MENU_INTERNET } from './constants';
import { parseRegQuery } from './parseRegQuery';
import { programOfCommand } from './programOfCommand';

/** The browsers Windows offers as the default one (StartMenuInternet), each once: the first key naming a program wins. */
export async function findWindowsBrowsers(): Promise<FoundBrowser[]> {
  const found = new Map<string, FoundBrowser>();
  for (const root of START_MENU_INTERNET) {
    const keys = parseRegQuery(await runProgram(REG.program, [REG.query, root, REG.recursive], REG.timeoutMs).catch(() => ''));
    for (const [path, key] of keys) {
      if (!path.endsWith(OPEN_COMMAND_KEY)) continue;
      const program = programOfCommand(key.values.get(DEFAULT_VALUE) ?? '');
      if (!program || found.has(program.toLowerCase())) continue;
      const browserKey = keys.get(path.slice(0, -OPEN_COMMAND_KEY.length));
      const keyName = (browserKey?.path ?? path).split('\\').pop() ?? program;
      const name = browserKey?.values.get(DEFAULT_VALUE) || keyName;
      found.set(program.toLowerCase(), {
        id: `${BROWSER_ID_PREFIX.windows}${keyName}`,
        name,
        engine: engineOf([program, keyName, name]),
        command: [program],
        urlAt: 1,
        iconFile: null,
        app: program,
        program,
        added: false,
      });
    }
  }
  return [...found.values()];
}
