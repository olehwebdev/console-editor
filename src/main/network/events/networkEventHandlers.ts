import { CDP } from '../../engine/constants';
import type { NetworkEventHandler } from '../types';
import { frameNavigated } from './frameNavigated';
import { loadingFailed } from './loadingFailed';
import { loadingFinished } from './loadingFinished';
import { requestExtraInfo } from './requestExtraInfo';
import { requestSent } from './requestSent';
import { responseExtraInfo } from './responseExtraInfo';
import { responseReceived } from './responseReceived';
import { servedFromCache } from './servedFromCache';
import { targetAttached } from './targetAttached';
import { targetDetached } from './targetDetached';

/** What the log does with each CDP event it listens to, on every session of the page. */
export const NETWORK_EVENT_HANDLERS: ReadonlyArray<[event: string, handler: NetworkEventHandler]> = [
  [CDP.Network.requestWillBeSent, requestSent],
  [CDP.Network.requestWillBeSentExtraInfo, requestExtraInfo],
  [CDP.Network.responseReceived, responseReceived],
  [CDP.Network.responseReceivedExtraInfo, responseExtraInfo],
  [CDP.Network.requestServedFromCache, servedFromCache],
  [CDP.Network.loadingFinished, loadingFinished],
  [CDP.Network.loadingFailed, loadingFailed],
  [CDP.Page.frameNavigated, frameNavigated],
  [CDP.Target.attachedToTarget, targetAttached],
  [CDP.Target.detachedFromTarget, targetDetached],
];
