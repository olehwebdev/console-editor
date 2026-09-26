import { basename } from 'node:path';
import type { BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import { loadSiteSourceMap, type PageController } from '../PageController';
import { mapFromFile, pickMapFile } from '../sourceMap';
import type { SourceMapFileStore } from '../store/SourceMapFileStore';
import { assertBundleUrl } from './assertBundleUrl';
import { assertSourceMapRequest } from './assertSourceMapRequest';
import type { IpcHandle } from './types';

/**
 * Source maps, the editor's alone: a bundle's own (found and fetched through the site's session), unless the
 * workspace loaded one for it from a file, which then comes first.
 */
export function registerSourceMapIpc(handle: IpcHandle, { win, page, sourceMaps }: { win: BrowserWindow; page: PageController; sourceMaps: SourceMapFileStore }): void {
  const content = (url: string) => page.getResourceContent(url);
  handle(IPC_CHANNEL.getSourceMap, async (request: unknown) => {
    assertSourceMapRequest(request);
    const file = await sourceMaps.read(request.bundleUrl);
    return file ? mapFromFile(request.bundleUrl, file, content) : loadSiteSourceMap(request, page.siteSession, content, page.view.webContents.getURL());
  });
  handle(IPC_CHANNEL.listSourceMapFiles, () => sourceMaps.list());
  handle(IPC_CHANNEL.loadSourceMapFile, async (bundleUrl: unknown) => {
    assertBundleUrl(bundleUrl);
    const picked = await pickMapFile(win, bundleUrl);
    return picked ? sourceMaps.add(bundleUrl, basename(picked.path), picked.bytes) : null;
  });
  handle(IPC_CHANNEL.forgetSourceMapFile, (bundleUrl: unknown) => {
    assertBundleUrl(bundleUrl);
    return sourceMaps.forget(bundleUrl);
  });
}
