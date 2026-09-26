/**
 * A workspace's overrides and rules as one file: what an export holds, and what an import adds to
 * another workspace (never one it already has, never an entry it can't read).
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildOverridesFile, importOverrides, importRules, overridesFileName, readOverridesFile } from '../../src/main/overridesFile';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { RuleStore } from '../../src/main/store/RuleStore';
import type { OverridesFile, OverridesImport } from '../../src/shared/types';

let dir: string;
let store: OverrideStore;
let rules: RuleStore;

const HASH = 'a'.repeat(64);
const script = { kind: 'Script' as const, sourceUrl: 'https://a.com/app.js', content: 'mine();', base: 'original();', originalHash: HASH };
const response = {
  kind: 'Fetch' as const,
  sourceUrl: 'https://a.com/api/cart',
  content: '{"items":[]}',
  originalHash: null,
  request: { method: 'POST', operation: 'Cart' },
  response: { status: 503, delayMs: 3000, headers: [{ operation: 'set' as const, name: 'Retry-After', value: '5' }], send: false, patch: false },
};
const block = { action: 'block' as const, match: { type: 'exact' as const, pattern: 'https://a.com/ads.js', ignoreQuery: true }, resourceTypes: [] };
const cors = { action: 'cors' as const, match: { type: 'glob' as const, pattern: 'https://api.a.com/*', ignoreQuery: false }, resourceTypes: [] };

const counts = (): OverridesImport => ({ overrides: 0, rules: 0, present: 0, unreadable: 0 });
/** Imports `file` into the active workspace, as the IPC handler does. */
async function importFile(file: Pick<OverridesFile, 'overrides' | 'rules'>): Promise<OverridesImport> {
  const result = counts();
  await importOverrides(store, file.overrides, result);
  await importRules(rules, file.rules, result);
  return result;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-share-'));
  store = new OverrideStore(dir);
  rules = new RuleStore(dir);
  await Promise.all([store.load(), rules.load()]);
  store.setWorkspace('ws1');
  rules.setWorkspace('ws1');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** The first workspace: a script edited from its base, a response answered without sending, one turned off; a block rule and a CORS one turned off. */
async function fillFirstWorkspace(): Promise<void> {
  await store.create(script);
  await store.create(response);
  const off = await store.create({ kind: 'Stylesheet', sourceUrl: 'https://a.com/app.css', content: 'body{}', originalHash: null });
  await store.update(off.id, { enabled: false });
  await rules.create(block);
  const corsRule = await rules.create(cors);
  await rules.update(corsRule.id, { enabled: false });
}

describe('export', () => {
  it("lists the active workspace's overrides with their content and base, and its rules, without ids", async () => {
    await fillFirstWorkspace();
    store.setWorkspace('ws2');
    await store.create({ ...script, sourceUrl: 'https://b.com/other.js' });
    store.setWorkspace('ws1');

    const file = await buildOverridesFile(store, rules);
    expect(file).toMatchObject({ format: 'console-editor-overrides', version: 1 });
    expect(file.overrides).toEqual([
      { kind: 'Script', sourceUrl: script.sourceUrl, match: { type: 'exact', pattern: script.sourceUrl, ignoreQuery: true }, enabled: true, originalHash: HASH, content: 'mine();', base: 'original();' },
      expect.objectContaining({ kind: 'Fetch', request: response.request, response: response.response, content: response.content }),
      expect.objectContaining({ kind: 'Stylesheet', enabled: false }),
    ]);
    // No base is written when editing started from the content itself.
    expect(file.overrides[1]).not.toHaveProperty('base');
    expect(file.rules).toEqual([
      { ...block, enabled: true },
      { ...cors, enabled: false },
    ]);
    expect(JSON.stringify(file)).not.toMatch(/"(id|createdAt|updatedAt|workspaceId)"/);
  });

  it('is named after the page', () => {
    expect(overridesFileName('https://shop.test/cart?x=1')).toBe('shop.test-overrides.json');
    expect(overridesFileName('')).toBe('workspace-overrides.json');
  });
});

describe('import', () => {
  it('recreates them in another workspace as they were: content, base, settings, on or off', async () => {
    await fillFirstWorkspace();
    const file = JSON.parse(JSON.stringify(await buildOverridesFile(store, rules))) as OverridesFile;
    store.setWorkspace('ws2');
    rules.setWorkspace('ws2');

    expect(await importFile(file)).toEqual({ overrides: 3, rules: 2, present: 0, unreadable: 0 });
    const [first, second, third] = store.list();
    expect(first).toMatchObject({ kind: 'Script', content: 'mine();', enabled: true, originalHash: HASH });
    expect(await store.base(first.id)).toBe('original();');
    expect(second).toMatchObject({ request: response.request, response: response.response });
    expect(third.enabled).toBe(false);
    expect(rules.forRenderer().map((r) => [r.action, r.enabled])).toEqual([
      ['block', true],
      ['cors', false],
    ]);
    // The first workspace's are untouched.
    store.setWorkspace('ws1');
    expect(store.list()).toHaveLength(3);
  });

  it('keeps what the workspace already has, and adds one listed twice once', async () => {
    await store.create({ ...script, content: 'my own version();' });
    await rules.create(block);
    const file = await buildOverridesFile(store, rules);
    const other = { ...file.overrides[0], sourceUrl: 'https://a.com/b.js', match: { type: 'exact' as const, pattern: 'https://a.com/b.js', ignoreQuery: true } };

    expect(await importFile({ overrides: [{ ...file.overrides[0], content: 'theirs();' }, other, other], rules: file.rules })).toEqual({ overrides: 1, rules: 0, present: 3, unreadable: 0 });
    expect(store.list().map((o) => o.content)).toEqual(['my own version();', 'my own version();']);
  });

  it("tells a response override apart by its method and operation", async () => {
    await store.create(response);
    const file = await buildOverridesFile(store, rules);
    const getter = { ...file.overrides[0], request: { method: 'GET', operation: 'Cart' } };
    expect(await importFile({ overrides: [getter], rules: [] })).toMatchObject({ overrides: 1, present: 0 });
  });

  it("leaves out what it can't read, and adds the rest", async () => {
    const good = { ...script, match: { type: 'exact', pattern: script.sourceUrl, ignoreQuery: true }, enabled: true };
    const unreadable = [
      null,
      { ...good, kind: 'Image' },
      { ...good, sourceUrl: 'ftp://a.com/app.js' },
      { ...good, match: { type: 'regex', pattern: '(', ignoreQuery: false } },
      { ...good, originalHash: 'abc' },
      { ...good, content: 42 },
      // Only a response override matches a method.
      { ...good, request: { method: 'GET', operation: '' } },
      { ...good, kind: 'Fetch', response: { ...response.response, status: 999 } },
    ];
    const rulesIn = [{ ...block, action: 'rewrite' }, { ...block, match: { type: 'exact', pattern: 'data:text/plain,x', ignoreQuery: false } }, cors];
    expect(await importFile({ overrides: [...unreadable, good], rules: rulesIn } as never)).toEqual({ overrides: 1, rules: 1, present: 0, unreadable: 10 });
    expect(store.list()).toHaveLength(1);
  });
});

describe('reading a file', () => {
  const write = async (content: unknown) => {
    const path = join(dir, 'import.json');
    await writeFile(path, typeof content === 'string' ? content : JSON.stringify(content));
    return path;
  };

  it('takes an export, with a missing list read as empty', async () => {
    expect(await readOverridesFile(await write({ format: 'console-editor-overrides', version: 1, overrides: [{ a: 1 }] }))).toEqual({ format: 'console-editor-overrides', version: 1, overrides: [{ a: 1 }], rules: [] });
  });

  it('refuses a file that is not JSON, not an export, from a newer version, or too long', async () => {
    await expect(readOverridesFile(await write('{nope'))).rejects.toThrow("isn't JSON");
    await expect(readOverridesFile(await write({ log: { entries: [] } }))).rejects.toThrow("isn't an export of Console Editor's overrides");
    await expect(readOverridesFile(await write({ format: 'console-editor-overrides', version: 2 }))).rejects.toThrow('newer version');
    await expect(readOverridesFile(await write({ format: 'console-editor-overrides', version: 1, overrides: Array(501).fill({}) }))).rejects.toThrow('over 500 overrides');
  });
});
