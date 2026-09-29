import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXECUTABLE_MODE, INSTALLED_MARKER, TEMP_PREFIX, ZIP_NAME } from './constants';
import { downloadTo } from './downloadTo';
import type { WebKitBuild } from './types';

/**
 * Downloads a WebKit build and unpacks it where it goes, as Playwright's installer does (which the app can't run: it
 * starts Node as a child, which a packaged app doesn't allow): each mirror in turn, the folder emptied first, the
 * program made runnable, and the marker written last. A build that fails half way is taken out again.
 */
export async function installWebKit(build: WebKitBuild, progress: (done: number, total: number | null) => void): Promise<void> {
  const temp = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  const zip = join(temp, ZIP_NAME);
  try {
    let failure: unknown = null;
    for (const url of build.urls) {
      failure = await downloadTo(url, zip, progress).then(
        () => null,
        (err: unknown) => err,
      );
      if (!failure) break;
    }
    if (failure) throw failure;
    await rm(build.directory, { recursive: true, force: true });
    const { utils } = await import('playwright-core/lib/coreBundle');
    await utils.extractZip(zip, { dir: build.directory });
    await chmod(build.executable, EXECUTABLE_MODE);
    await writeFile(join(build.directory, INSTALLED_MARKER), '');
  } catch (err) {
    await rm(build.directory, { recursive: true, force: true });
    throw err;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
