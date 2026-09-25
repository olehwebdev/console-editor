import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import type { GetPropertiesReply } from '../types';

/** One level of an object's own properties, with previews of their values; undefined if its session can't answer. */
export function ownProperties(transport: CdpTransport, objectId: string): Promise<GetPropertiesReply | undefined> {
  return transport.send<GetPropertiesReply>(CDP.Runtime.getProperties, { objectId, ownProperties: true, generatePreview: true }).catch(() => undefined);
}
