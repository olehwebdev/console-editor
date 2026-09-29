import { readFile } from 'node:fs/promises';
import { BROWSER_ID_PREFIX } from '../../constants';
import { engineOf } from '../../engineOf';
import type { FoundBrowser } from '../../types';
import { commandOf } from './commandOf';
import { findLinuxIcon } from './findLinuxIcon';
import { isBrowserEntry } from './isBrowserEntry';
import { parseDesktopEntry } from './parseDesktopEntry';
import { programExists } from './programExists';
import { programOf } from './programOf';
import { splitExec } from './splitExec';

/** The browser a launcher starts, when it is one whose program is there (its `TryExec`, else the one it runs); null otherwise. */
export async function readDesktopBrowser(path: string, fileId: string, dataDirs: string[]): Promise<FoundBrowser | null> {
  const text = await readFile(path, 'utf8').catch(() => null);
  if (text === null) return null;
  const keys = parseDesktopEntry(text);
  if (!isBrowserEntry(keys, fileId)) return null;
  const command = commandOf(splitExec(keys.Exec));
  const program = programOf(command.command);
  if (!program || !programExists(keys.TryExec || program)) return null;
  return {
    id: `${BROWSER_ID_PREFIX.desktop}${fileId}`,
    name: keys.Name,
    engine: engineOf([fileId, program, keys.Name]),
    ...command,
    iconFile: await findLinuxIcon(keys.Icon, dataDirs),
    app: null,
    program,
    added: false,
  };
}
