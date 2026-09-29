import { join } from 'node:path';
import type { FoundBrowser } from '../../types';
import { desktopDataDirs } from './desktopDataDirs';
import { desktopFiles } from './desktopFiles';
import { labelDuplicates } from './labelDuplicates';
import { readDesktopBrowser } from './readDesktopBrowser';

const APPLICATIONS = 'applications';

/**
 * The browsers the desktop's launchers start. A launcher's id is its path below its applications folder (`/` as `-`);
 * the first folder with an id wins, as the spec says (the user's own entry replaces the system's, browser or not).
 */
export async function findLinuxBrowsers(): Promise<FoundBrowser[]> {
  const dataDirs = desktopDataDirs();
  const seen = new Set<string>();
  const found: { browser: FoundBrowser; path: string }[] = [];
  for (const dir of dataDirs) {
    const applications = join(dir, APPLICATIONS);
    for (const file of await desktopFiles(applications)) {
      const fileId = file.replaceAll('/', '-');
      if (seen.has(fileId)) continue;
      seen.add(fileId);
      const path = join(applications, file);
      const browser = await readDesktopBrowser(path, fileId, dataDirs);
      if (browser) found.push({ browser, path });
    }
  }
  return labelDuplicates(found);
}
