import { writeFile } from 'node:fs/promises';
import { dialog, type BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { OverridesImport } from '../../shared/types';
import { buildOverridesFile, importOverrides, importRules, OVERRIDES_FILE_FILTERS, overridesFileName, readOverridesFile } from '../overridesFile';
import type { PageController } from '../PageController';
import type { OverrideStore } from '../store/OverrideStore';
import type { RuleStore } from '../store/RuleStore';
import type { IpcHandle } from './types';

interface OverridesFileDeps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  rules: RuleStore;
}

/** Exporting the active workspace's overrides and rules as one file, and importing one into it; each through a file dialog. */
export function registerOverridesFileIpc(handle: IpcHandle, { win, page, store, rules }: OverridesFileDeps): void {
  handle(IPC_CHANNEL.exportOverrides, async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, { title: 'Export overrides and rules', defaultPath: overridesFileName(page.state().url), filters: OVERRIDES_FILE_FILTERS });
    if (canceled || !filePath) return null;
    const file = await buildOverridesFile(store, rules);
    await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`);
    return { path: filePath, overrides: file.overrides.length, rules: file.rules.length };
  });
  handle(IPC_CHANNEL.importOverrides, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Import overrides and rules', filters: OVERRIDES_FILE_FILTERS, properties: ['openFile'] });
    if (canceled || !filePaths[0]) return null;
    const file = await readOverridesFile(filePaths[0]);
    const counts: OverridesImport = { overrides: 0, rules: 0, present: 0, unreadable: 0 };
    try {
      await importOverrides(store, file.overrides, counts);
      await importRules(rules, file.rules, counts);
    } finally {
      // What was added before a failure is served, and listed, all the same.
      if (counts.overrides) await page.overridesChanged();
      if (counts.rules) await page.rulesChanged();
    }
    return counts;
  });
}
