import { BIDI, type BidiConnection } from '../../../engine/bidi';

/** What `script.evaluate` answers, as far as a string result goes. */
interface Evaluated {
  type: string;
  result?: { type: string; value?: unknown };
}

/**
 * Runs `expression` in a tab's page (in a sandbox of it when named; awaited when it is a promise); its value when that
 * is a string, else null.
 */
export async function evaluateIn(connection: BidiConnection, context: string, expression: string, awaitPromise = false, sandbox?: string): Promise<string | null> {
  const target = sandbox ? { context, sandbox } : { context };
  const evaluated = await connection.send<Evaluated>(BIDI.script.evaluate, { expression, target, awaitPromise }).catch(() => null);
  const value = evaluated?.result?.value;
  return typeof value === 'string' ? value : null;
}
