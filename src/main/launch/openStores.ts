import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { OverrideStore } from '../store/OverrideStore';
import { PageWindowStore } from '../store/PageWindowStore';
import { RuleStore } from '../store/RuleStore';
import { SessionStore } from '../store/SessionStore';
import { SettingsStore } from '../store/SettingsStore';
import { USER_DATA } from './constants';
import type { AppStores } from './types';

/** Opens and loads the stores kept in `userData`. */
export async function openStores(userData: string): Promise<AppStores> {
  // Looked at before the stores create their folders.
  const hadData = [USER_DATA.settings, USER_DATA.session, USER_DATA.workspace].some((name) => existsSync(join(userData, name)));
  const store = new OverrideStore(join(userData, USER_DATA.workspace));
  const rules = new RuleStore(join(userData, USER_DATA.workspace));
  const settings = new SettingsStore(join(userData, USER_DATA.settings));
  const session = new SessionStore(join(userData, USER_DATA.session));
  const pageWindow = new PageWindowStore(join(userData, USER_DATA.pageWindow));
  await Promise.all([store.load(), rules.load(), settings.load(), session.load(), pageWindow.load()]);
  return { store, rules, settings, session, pageWindow, hadData };
}
