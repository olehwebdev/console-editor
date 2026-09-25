import { ConsoleService } from '../console';
import type { CdpTransport } from '../engine/cdp';
import type { PageInterception } from '../engine/PageInterception';
import { NetworkLog } from '../network';
import { interceptPage, type PageSources } from './interceptPage';

/** What listens to the page's CDP transport. */
export interface PageListeners {
  console: ConsoleService;
  network: NetworkLog;
  engine: PageInterception;
}

/**
 * The console, the network log and interception, on one page's transport: interception hands each
 * frame session to the console, tells the log which requests an override answered, and has the log's
 * held requests keep what breakpoints stop.
 */
export function wirePage(transport: CdpTransport, sources: Omit<PageSources, 'network'>): PageListeners {
  const consoleService = new ConsoleService({ getSettings: () => sources.settings.get(), send: sources.send });
  const network = new NetworkLog({ transport, send: sources.send });
  const engine = interceptPage(transport, consoleService, { ...sources, network });
  return { console: consoleService, network, engine };
}
