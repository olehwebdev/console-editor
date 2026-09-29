import { FIGMA_STATUS, FIGMA_TIMEOUT_MS, TOKEN_HEADER } from './constants';

/** What Figma's API answers at `url`, asked with `token`; a refusal is said in words (Figma's own, when it gives some). */
export async function figmaJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { [TOKEN_HEADER]: token }, signal: AbortSignal.timeout(FIGMA_TIMEOUT_MS) }).catch((err: unknown) => {
    throw new Error(`Could not reach Figma: ${err instanceof Error ? err.message : String(err)}`);
  });
  if (response.ok) return (await response.json()) as T;
  const said = ((await response.json().catch(() => null)) as { err?: unknown } | null)?.err;
  throw new Error(FIGMA_STATUS[response.status] ?? (typeof said === 'string' && said ? `Figma: ${said}` : `Figma answered ${response.status}`));
}
