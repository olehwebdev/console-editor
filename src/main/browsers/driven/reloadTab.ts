import { CDP } from '../../engine/constants';
import type { DrivenTabState } from './types';

/** Reloads a tab from the network, first asking service workers that run outdated code to unregister. */
export async function reloadTab(tab: DrivenTabState): Promise<void> {
  await tab.interception.prepareReload(tab.info.url);
  await tab.transport.send(CDP.Page.reload, { ignoreCache: true });
}
