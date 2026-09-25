/**
 * HAR files: the Network panel's requests written as HAR 1.2 entries, and a HAR's fetch() and XHR
 * responses read back as response overrides that answer without sending the request.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { harEntryOf } from '../../src/main/har/harEntryOf';
import { overridesFromHar, readHarFile } from '../../src/main/har';
import type { TrackedRequest } from '../../src/main/network/types';

const API = 'https://api.test/graphql';

function tracked(extra: Partial<TrackedRequest> = {}, row: Partial<TrackedRequest['row']> = {}): TrackedRequest {
  return {
    requestId: 'r1',
    sentAt: 1,
    requestHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    statusText: 'OK',
    ...extra,
    row: { id: '1', url: `${API}?v=2&debug`, method: 'POST', type: 'Fetch', state: 'done', status: 200, mimeType: 'application/json', startedAt: Date.UTC(2026, 8, 25, 12), duration: 42, size: 120, hasBody: true, pageLoad: 0, ...row },
  };
}

/** A HAR entry as Chrome DevTools writes one. */
function entry(url: string, extra: { method?: string; status?: number; type?: string; mimeType?: string; text?: string; encoding?: string; postData?: string } = {}) {
  return {
    _resourceType: extra.type ?? 'fetch',
    request: { method: extra.method ?? 'GET', url, ...(extra.postData ? { postData: { mimeType: 'application/json', text: extra.postData } } : {}) },
    response: { status: extra.status ?? 200, content: { mimeType: extra.mimeType ?? 'application/json', ...(extra.text !== undefined ? { text: extra.text } : {}), ...(extra.encoding ? { encoding: extra.encoding } : {}) } },
  };
}

describe('writing a HAR', () => {
  it('writes a request with its wire headers, query, body and response, and its time', () => {
    const har = harEntryOf({
      entry: tracked({ wireRequestHeaders: [{ name: 'Cookie', value: 'sid=1' }], wireResponseHeaders: [{ name: 'Location', value: '/next' }] }),
      requestBody: '{"operationName":"GetUser"}',
      responseBody: '{"data":{}}',
    });
    expect(har).toMatchObject({
      startedDateTime: '2026-09-25T12:00:00.000Z',
      time: 42,
      request: { method: 'POST', url: `${API}?v=2&debug`, headers: [{ name: 'Cookie', value: 'sid=1' }], queryString: [{ name: 'v', value: '2' }, { name: 'debug', value: '' }], bodySize: 27 },
      response: { status: 200, statusText: 'OK', content: { size: 11, mimeType: 'application/json', text: '{"data":{}}' }, redirectURL: '/next', bodySize: 120 },
      timings: { wait: 42 },
      _resourceType: 'fetch',
    });
    // The wire headers carry no content type: the body's is unknown.
    expect(har.request.postData).toEqual({ mimeType: '', text: '{"operationName":"GetUser"}' });
  });

  it("leaves out a body it couldn't read, and writes a socket's messages as Chrome does", () => {
    const at = Date.UTC(2026, 8, 25, 12);
    const har = harEntryOf({
      entry: tracked(
        { messages: [{ direction: 'sent', at, binary: false, data: 'ping', length: 4 }, { direction: 'received', at: at + 5, binary: true, data: 'AQID', length: 3 }] },
        { type: 'WebSocket', method: 'GET', status: 101, hasBody: false },
      ),
    });
    expect(har.request).not.toHaveProperty('postData');
    expect(har.response.content).toEqual({ size: 120, mimeType: 'application/json' });
    expect(har._resourceType).toBe('websocket');
    expect(har._webSocketMessages).toEqual([
      { type: 'send', time: at / 1000, opcode: 1, data: 'ping' },
      { type: 'receive', time: (at + 5) / 1000, opcode: 2, data: 'AQID' },
    ]);
  });
});

describe('importing a HAR as overrides', () => {
  it('makes one answered without sending per fetch() or XHR response with a text body', () => {
    const { overrides, skipped } = overridesFromHar([
      entry('https://api.test/cart', { text: '{"items":[]}' }),
      entry('https://api.test/search?q=shoes', { type: 'xhr', text: '[]', status: 404 }),
      entry(API, { method: 'post', postData: '{"operationName":"GetUser"}', text: '{"data":null}' }),
      entry('https://api.test/page', { type: 'document', text: '<html>' }),
      entry('https://api.test/logo.png', { type: 'fetch', mimeType: 'image/png' }),
      entry('ftp://api.test/x', { text: '{}' }),
    ]);
    expect(skipped).toBe(3);
    expect(overrides).toEqual([
      {
        kind: 'Fetch',
        sourceUrl: 'https://api.test/cart',
        content: '{"items":[]}',
        originalHash: null,
        match: { type: 'exact', pattern: 'https://api.test/cart', ignoreQuery: true },
        request: { method: 'GET', operation: '' },
        response: { status: 200, delayMs: 0, headers: [], send: false, patch: false },
      },
      expect.objectContaining({ match: { type: 'exact', pattern: 'https://api.test/search?q=shoes', ignoreQuery: false }, response: expect.objectContaining({ status: 404 }) }),
      expect.objectContaining({ request: { method: 'POST', operation: 'GetUser' }, content: '{"data":null}' }),
    ]);
  });

  it('keeps the last response to the same request, decodes base64 text, and keeps a type other than JSON', () => {
    const { overrides, skipped } = overridesFromHar([
      entry('https://api.test/cart', { text: '{"v":1}' }),
      entry('https://api.test/feed.xml', { mimeType: 'application/rss+xml', text: Buffer.from('<rss/>').toString('base64'), encoding: 'base64' }),
      entry('https://api.test/cart', { text: '{"v":2}' }),
    ]);
    expect(skipped).toBe(1);
    expect(overrides.map((o) => o.content)).toEqual(['<rss/>', '{"v":2}']);
    expect(overrides[0]!.response!.headers).toEqual([{ operation: 'set', name: 'Content-Type', value: 'application/rss+xml' }]);
  });

  it('reads a request with no _resourceType by its type, and turns down a status that is not one', () => {
    const plain = { request: { method: 'GET', url: 'https://api.test/me' }, response: { status: 200, content: { mimeType: 'application/json', text: '{}' } } };
    expect(overridesFromHar([plain, { ...plain, response: { ...plain.response, status: 0 } }, null, 'junk']).overrides).toHaveLength(1);
  });

  describe('the file', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'console-editor-har-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('is JSON with a log of entries', async () => {
      const path = join(dir, 'a.har');
      await writeFile(path, JSON.stringify({ log: { entries: [entry('https://api.test/a', { text: '{}' })] } }));
      expect(await readHarFile(path)).toHaveLength(1);
      await writeFile(path, 'not json');
      await expect(readHarFile(path)).rejects.toThrow(/isn't JSON/);
      await writeFile(path, '{"log":{}}');
      await expect(readHarFile(path)).rejects.toThrow(/no log of requests/);
    });
  });
});
