import { BIDI, type BidiConnection } from '../../../engine/bidi';

/** What `script.evaluate` answers, as far as a string result goes. */
interface Evaluated {
  type: string;
  result?: { type: string; value?: unknown };
}

/** Runs `expression` in a tab's page (awaited when it is a promise); its value when that is a string, else null. */
export async function evaluateIn(connection: BidiConnection, context: string, expression: string, awaitPromise = false): Promise<string | null> {
  const evaluated = await connection.send<Evaluated>(BIDI.script.evaluate, { expression, target: { context }, awaitPromise }).catch(() => null);
  const value = evaluated?.result?.value;
  return typeof value === 'string' ? value : null;
}
