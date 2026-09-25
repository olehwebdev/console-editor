/**
 * A page that talks to an API, for the Network panel and response overrides, all under /network/:
 * a JSON endpoint (by fetch() and XHR), a GraphQL endpoint (one URL, many operations), an event
 * stream, an endpoint that fails, and a dedicated worker that fetches too. API answers are never
 * cached, so every call reaches the network (and the Fetch domain).
 */
import type { FixtureRoute } from './site.ts';

export const NETWORK_PATH = '/network/';
export const CART_PATH = '/network/api/cart';
export const GRAPHQL_PATH = '/network/graphql';
export const EVENTS_PATH = '/network/events';
export const BROKEN_PATH = '/network/api/broken';
export const NETWORK_WORKER_PATH = '/network/worker.js';
export const WORKER_DATA_PATH = '/network/api/worker';

/** What the cart endpoint answers, on one line as APIs send it. */
export const CART_JSON = JSON.stringify({ items: [{ id: 1, name: 'Alpha', price: 12.5 }, { id: 2, name: 'Beta', price: 7.25 }], total: 19.75 });

/** What the GraphQL endpoint answers, whatever the operation. */
export const GRAPHQL_JSON = JSON.stringify({ data: { user: { name: 'Ada', id: 7 } } });

export const WORKER_DATA_JSON = JSON.stringify({ source: 'upstream' });
export const BROKEN_JSON = JSON.stringify({ error: 'boom' });

/** How often the event stream sends, in ms. */
export const EVENT_INTERVAL_MS = 200;

const NETWORK_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Network fixture</title></head>
<body>
  <h1>Network fixture</h1>
  <p id="cart">cart: loading</p>
  <p id="user">user: loading</p>
  <p id="worker">worker: loading</p>
  <script>
    window.loadCart = async () => {
      const res = await fetch('${CART_PATH}');
      window.cartStatus = res.status;
      window.cart = await res.json().catch(() => null);
      document.querySelector('#cart').textContent = 'cart: ' + (window.cart ? window.cart.items.length + ' items, total ' + window.cart.total : 'unreadable');
      return window.cart;
    };
    window.xhrCart = () => new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '${CART_PATH}?via=xhr');
      xhr.onload = () => resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      xhr.send();
    });
    window.gql = async (operationName) => {
      const res = await fetch('${GRAPHQL_PATH}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName, query: 'query ' + operationName + ' { user { name id } }', variables: {} }),
      });
      return res.json();
    };
    window.loadUser = async () => {
      window.user = await gql('GetUser');
      document.querySelector('#user').textContent = 'user: ' + window.user.data.user.name;
      return window.user;
    };
    window.loadBroken = async () => (await fetch('${BROKEN_PATH}')).status;
    window.ticks = 0;
    new EventSource('${EVENTS_PATH}').onmessage = (e) => {
      window.ticks += 1;
      window.lastEvent = e.data;
    };
    const worker = new Worker('${NETWORK_WORKER_PATH}');
    worker.onmessage = (e) => {
      window.workerData = e.data;
      document.querySelector('#worker').textContent = 'worker: ' + e.data.source;
    };
    window.askWorker = () => worker.postMessage('load');
    loadCart();
    loadUser();
  </script>
</body>
</html>
`;

/** Fetches as it starts, and again when asked. */
const NETWORK_WORKER_JS = `const load = () => fetch('${WORKER_DATA_PATH}').then((r) => r.json()).then((data) => postMessage(data));
onmessage = load;
load();
`;

const JSON_TYPE = 'application/json';

/** An API's answers: never cached. */
const API: Pick<FixtureRoute, 'headers'> = { headers: { 'Cache-Control': 'no-store' } };

export const networkRoutes: Array<[string, FixtureRoute]> = [
  [NETWORK_PATH, { type: 'text/html; charset=utf-8', body: NETWORK_HTML, ...API }],
  [CART_PATH, { type: JSON_TYPE, body: CART_JSON, ...API }],
  [GRAPHQL_PATH, { type: JSON_TYPE, body: GRAPHQL_JSON, ...API }],
  [BROKEN_PATH, { type: JSON_TYPE, body: BROKEN_JSON, status: 500, ...API }],
  [EVENTS_PATH, { type: 'text/event-stream', body: '', eventStream: true, ...API }],
  [NETWORK_WORKER_PATH, { type: 'text/javascript', body: NETWORK_WORKER_JS, ...API }],
  [WORKER_DATA_PATH, { type: JSON_TYPE, body: WORKER_DATA_JSON, ...API }],
];
