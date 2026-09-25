import { describe, expect, it, vi } from 'vitest';
import type { NetworkRequest, StackFrame } from '../../src/shared/types';
import { locationKey } from '@/entities/inspector';

// The Component page's folder loads Monaco through the editor panel, which needs a browser.
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', requestReveal: vi.fn() }));

const { requestsFrom } = await import('@/widgets/editor-panel/ui/ComponentPage/requestsFrom');

const APP_JS = 'https://site.test/app.js';
const CART = 'https://site.test/src/CartItem.tsx';
const call = (column: number): StackFrame => ({ name: '', url: APP_JS, line: 0, column });
const place = (url: string) => ({ bundleUrl: APP_JS, url, line: 1, column: 1, name: null, rawOffset: null });
const request = (id: string, initiator: StackFrame[] | undefined, frameId = 'top'): NetworkRequest => ({
  id,
  url: `https://site.test/api/${id}`,
  method: 'GET',
  type: 'Fetch',
  state: 'done',
  status: 200,
  mimeType: 'application/json',
  startedAt: 0,
  frameId,
  hasBody: false,
  pageLoad: 1,
  initiator,
});

describe('requests by component (renderer)', () => {
  it("lists the requests of the component's frame whose sending script passed through its file, the newest first, with that call", () => {
    const origins = {
      [locationKey(call(1))]: place('https://site.test/node_modules/axios/lib/xhr.js'),
      [locationKey(call(2))]: place(CART),
      [locationKey(call(3))]: place('https://site.test/src/Checkout.tsx'),
    };
    const requests = [request('a', [call(1), call(2)]), request('b', [call(3)]), request('c', undefined), request('d', [call(2)], 'child'), request('e', [call(2)])];
    expect(requestsFrom(requests, CART, 'top', origins)).toEqual([
      { request: requests[4], call: call(2) },
      { request: requests[0], call: call(2) },
    ]);
    // A component whose frame isn't known: every frame's.
    expect(requestsFrom(requests, CART, null, origins).map((r) => r.request.id)).toEqual(['e', 'd', 'a']);
    // Calls not traced yet match nothing.
    expect(requestsFrom(requests, CART, 'top', {})).toEqual([]);
  });
});
