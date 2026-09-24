import { HTTP_SCHEME } from '../../constants';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import type { SessionKey } from '../ConsoleFrames';
import type { ConsoleApiCalled, ExceptionThrown, ExecutionContext, LogEntryAdded, PageFrame } from '../types';
import { consoleApiRow } from './consoleApiRow';
import { exceptionRow } from './exceptionRow';
import { logRow } from './logRow';
import { textRow } from './textRow';
import type { SessionSinks } from './types';

/** Follows a session's frames, contexts and messages while the console records; returns the unsubscribers. */
export function listenToSession(id: SessionKey, transport: CdpTransport, sinks: SessionSinks): Array<() => void> {
  const { frames, push, value } = sinks;
  const on = <T>(event: string, handler: (params: T) => void) =>
    transport.on(event, (params: T) => {
      if (sinks.recording()) handler(params);
    });
  return [
    on<{ frame: PageFrame }>(CDP.Page.frameNavigated, ({ frame }) => {
      frames.navigated(id, frame);
      // A divider in the stream; about:blank and error pages aren't worth one.
      if (HTTP_SCHEME.test(frame.url)) push(textRow({ frameId: frame.id, level: 'info', source: 'navigation' }, frame.url));
    }),
    on<{ frameId: string; parentFrameId?: string }>(CDP.Page.frameAttached, (p) => frames.attached(id, p.frameId, p.parentFrameId)),
    on<{ frameId: string; reason?: string }>(CDP.Page.frameDetached, (p) => frames.detached(p.frameId, p.reason)),
    on<{ context: ExecutionContext }>(CDP.Runtime.executionContextCreated, (p) => frames.contextCreated(id, p.context)),
    on<{ executionContextId: number }>(CDP.Runtime.executionContextDestroyed, (p) => frames.contextDestroyed(id, p.executionContextId)),
    on(CDP.Runtime.executionContextsCleared, () => frames.contextsCleared(id)),
    on<ConsoleApiCalled>(CDP.Runtime.consoleAPICalled, (p) => {
      const row = consoleApiRow(p, frames.frameOf(id, p.executionContextId), value);
      if (row) push(row);
    }),
    on<ExceptionThrown>(CDP.Runtime.exceptionThrown, (p) =>
      push(exceptionRow(frames.frameOf(id, p.exceptionDetails.executionContextId), 'exception', p.exceptionDetails, value, p.timestamp)),
    ),
    // The browser's messages don't say which context they are about: the session's own frame is the best guess.
    on<LogEntryAdded>(CDP.Log.entryAdded, (p) => push(logRow(p, frames.frameOf(id)))),
  ];
}
