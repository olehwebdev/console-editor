import { basename, join, relative } from 'node:path';
import { REGISTRY_NAME } from './constants';
import type { WebKitBuild } from './types';

/**
 * Where Playwright's WebKit build for this system goes under `buildsDir`, where it is downloaded from and its version,
 * as the pinned playwright-core's registry says (its mirrors, or `PLAYWRIGHT_DOWNLOAD_HOST`'s).
 */
export async function webkitBuild(buildsDir: string): Promise<WebKitBuild> {
  const { registry } = await import('playwright-core/lib/coreBundle');
  const found = registry.registry.findExecutable(REGISTRY_NAME);
  const [directory, executable] = [found?.directory, found?.executablePath()];
  if (!directory || !executable || !found?.downloadURLs?.length) throw new Error("There's no WebKit build for this system");
  const own = join(buildsDir, basename(directory));
  return { directory: own, executable: join(own, relative(directory, executable)), urls: found.downloadURLs, version: found.browserVersion ?? null };
}
