import { CDP } from '../../../engine/constants';
import type { CdpConnection } from '../../../engine/websocketTransport';
import type { TabRead } from '../types';
import type { PageTargetInfo } from './types';

/** What the browser says of each tab now (its title, which isn't announced as it changes); a tab gone is left out. */
export async function readTabInfos(connection: CdpConnection, ids: string[]): Promise<TabRead[]> {
  const infos = await Promise.all(ids.map((targetId) => connection.send<{ targetInfo: PageTargetInfo }>(CDP.Target.getTargetInfo, { targetId }).then(({ targetInfo }) => targetInfo, () => null)));
  return infos.filter((info) => info !== null).map(({ targetId, url, title }) => ({ id: targetId, url, title }));
}
