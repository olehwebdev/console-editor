import { BIDI, type BidiConnection } from '../../../engine/bidi';
import { TITLE_EXPRESSION } from './constants';
import { evaluateIn } from './evaluateIn';
import type { TabRead } from '../types';
import type { ContextInfo } from './types';

/** Each tab's address (from the tree) and title (asked of its page, which BiDi doesn't report). */
export async function readFirefoxTabs(connection: BidiConnection, ids: string[]): Promise<TabRead[]> {
  const { contexts } = await connection.send<{ contexts: ContextInfo[] }>(BIDI.browsingContext.getTree, { maxDepth: 0 }).catch(() => ({ contexts: [] as ContextInfo[] }));
  const titles = await Promise.all(ids.map((id) => evaluateIn(connection, id, TITLE_EXPRESSION)));
  return ids.map((id, i) => {
    const url = contexts.find((c) => c.context === id)?.url;
    const title = titles[i];
    return { id, ...(url === undefined ? {} : { url }), ...(title === null ? {} : { title }) };
  });
}
