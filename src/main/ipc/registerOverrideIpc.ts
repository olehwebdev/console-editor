import { shell } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import { RESOURCE_KINDS, type CreateOverrideInput, type OverridePatch } from '../../shared/types';
import { vscodeUrl } from '../overrideFiles';
import type { PageController } from '../PageController';
import type { OverrideStore } from '../store/OverrideStore';
import { assertString } from './assertString';
import type { IpcHandle } from './types';

/** The overrides' channels, for the editor UI. 'overrides-changed' is sent before each change's reply resolves. */
export function registerOverrideIpc(handle: IpcHandle, store: OverrideStore, page: PageController): void {
  handle(IPC_CHANNEL.listOverrides, () => store.metas());
  handle(IPC_CHANNEL.getOverride, (id: unknown) => {
    assertString(id, 'id');
    return store.get(id);
  });
  handle(IPC_CHANNEL.getOverrideBase, (id: unknown) => {
    assertString(id, 'id');
    return store.base(id);
  });
  handle(IPC_CHANNEL.createOverride, async (input: CreateOverrideInput) => {
    assertString(input?.sourceUrl, 'sourceUrl');
    assertString(input.content, 'content');
    if (input.base !== undefined) assertString(input.base, 'base');
    if (!RESOURCE_KINDS.includes(input.kind)) throw new Error(`Unsupported kind ${String(input.kind)}`);
    const created = await store.create(input);
    await page.overridesChanged();
    return store.meta(created.id);
  });
  handle(IPC_CHANNEL.updateOverride, async (id: unknown, patch: OverridePatch) => {
    assertString(id, 'id');
    await store.update(id, patch);
    // Patterns follow the match, the switch and Send request (which stage a response override pauses at).
    await page.overridesChanged(patch.match !== undefined || patch.enabled !== undefined || patch.response !== undefined);
    return store.meta(id);
  });
  handle(IPC_CHANNEL.deleteOverride, async (id: unknown) => {
    assertString(id, 'id');
    await store.remove(id);
    await page.overridesChanged();
  });
  handle(IPC_CHANNEL.revealOverridesFolder, async () => {
    await shell.openPath(store.filesDir);
  });
  // Opened by VS Code's own URL, never as the system opens the file type: Windows runs a .js file.
  handle(IPC_CHANNEL.openOverrideInEditor, async (id: unknown) => {
    assertString(id, 'id');
    await shell.openExternal(vscodeUrl(store.contentPath(id)));
  });
  handle(IPC_CHANNEL.showOverrideFile, (id: unknown) => {
    assertString(id, 'id');
    shell.showItemInFolder(store.contentPath(id));
  });
}
