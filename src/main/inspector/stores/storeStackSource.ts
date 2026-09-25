import { MAX_STACK_FRAMES, STACK_TRACE_LIMIT } from './constants';

/**
 * Page-side, in the store stand-in (`STORE_HOOK_JS`): the stack of the code that
 * dispatched an action, read off a new Error as V8 writes it (`at name (url:line:column)`),
 * keeping the calls in files the page loaded (the stand-in's own have no URL). A
 * page's `Error.prepareStackTrace` (source-map-support sets one) is put aside while
 * it is read. Lines and columns become 0-based, as CDP's.
 */
export const STORE_STACK_JS = String.raw`
  const STACK_LINE = /^\s*at (?:(.*?) \()?(.+?):(\d+):(\d+)\)?$/;
  const LOADED = /^https?:/;
  const stackOf = () => {
    const limit = Error.stackTraceLimit;
    const prepare = Error.prepareStackTrace;
    let text = '';
    try {
      Error.stackTraceLimit = ${STACK_TRACE_LIMIT};
      if (prepare) Error.prepareStackTrace = undefined;
      text = String(new Error().stack || '');
    } catch (err) {
      // Nothing to tell.
    } finally {
      Error.stackTraceLimit = limit;
      if (prepare) Error.prepareStackTrace = prepare;
    }
    const frames = [];
    for (const line of text.split('\n')) {
      const match = STACK_LINE.exec(line);
      if (!match || !LOADED.test(match[2]) || frames.length >= ${MAX_STACK_FRAMES}) continue;
      frames.push({ name: (match[1] || '').replace(/^async /, ''), url: match[2], line: Number(match[3]) - 1, column: Number(match[4]) - 1 });
    }
    return frames;
  };
`;
