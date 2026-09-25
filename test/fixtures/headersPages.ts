/**
 * Pages and files for network rules (blocking, response headers, CORS), all
 * under /headers/ so the fixture site's other routes, and what tests count of
 * them, stay as they are. Cross-site ones are reached through `localhost` on
 * the same port. Bodies stay small: the test harness's CDP connection drops
 * any message over 4 MiB.
 */
import type { FixtureRoute } from './site.ts';

// --- Blocking -------------------------------------------------------------------

/** A page with an analytics script and the app's own; each records whether it ran, or failed to load. */
export const TRACK_PATH = '/headers/track.html';
export const ANALYTICS_JS_PATH = '/headers/analytics.js';
export const TRACK_APP_JS_PATH = '/headers/track-app.js';
export const ANALYTICS_JS = `window.analyticsRan = true;\n`;
export const TRACK_APP_JS = `window.trackAppRan = true;\n`;
export const TRACK_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tracking fixture</title>
  <script src="${ANALYTICS_JS_PATH}" onerror="window.analyticsBlocked = true"></script>
  <script src="${TRACK_APP_JS_PATH}" onerror="window.trackAppBlocked = true"></script>
</head>
<body>
  <h1>Tracking fixture</h1>
  <p>Loads an analytics script and the app's own script.</p>
</body>
</html>
`;

/** A script that redirects to another: every hop pauses on its own. */
export const REDIRECT_JS_PATH = '/headers/redirect.js';
export const FINAL_JS_PATH = '/headers/final.js';
export const FINAL_JS = `window.finalRan = true;\n`;

// --- Response headers -----------------------------------------------------------

/** Only the page's own scripts may run: an inline script needs the policy gone. */
export const SELF_ONLY_CSP = "script-src 'self'";

/** Served gzipped (as every fixture file is) with SELF_ONLY_CSP: its external script runs, its inline one doesn't. */
export const CSP_PATH = '/headers/csp.html';
export const ALLOWED_JS_PATH = '/headers/allowed.js';
export const ALLOWED_JS = `window.extRan = true;\n`;
export const CSP_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CSP fixture</title>
  <script src="${ALLOWED_JS_PATH}"></script>
  <script>window.inlineRan = true;</script>
</head>
<body><h1>CSP fixture</h1></body>
</html>
`;

/**
 * No policy, so its inline script runs; its script is served as text/plain
 * with nosniff, so it is refused until its Content-Type is fixed.
 */
export const PLAIN_PATH = '/headers/plain.html';
export const PLAIN_SCRIPT_PATH = '/headers/plain-script.js';
export const PLAIN_SCRIPT = `window.plainScriptRan = true;\n`;
export const PLAIN_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Plain fixture</title>
  <script src="${PLAIN_SCRIPT_PATH}" onerror="window.plainScriptFailed = true"></script>
  <script>window.inlineRan = true;</script>
</head>
<body><h1>Plain fixture</h1></body>
</html>
`;

/** Same-origin JSON the HTTP cache may keep for ten minutes. */
export const SAME_JSON_PATH = '/headers/same.json';
export const SAME_JSON = `{"same":true}`;
export const SAME_JSON_CACHE_CONTROL = 'max-age=600';

/** A page on 127.0.0.1 framing a cross-site page that refuses to be framed; the frame posts 'xfo-loaded' once it runs. */
export const XFO_HOST_PATH = '/headers/xfo-host.html';
export const XFO_FRAME_PATH = '/headers/xfo-frame.html';
export const XFO_LOADED = 'xfo-loaded';
export const XFO_FRAME_HTML = `<!doctype html><meta charset="utf-8"><script>parent.postMessage('${XFO_LOADED}', '*');</script><p>framed</p>\n`;

export function xfoHostHtml(port: number): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Framing fixture</title>
  <script>window.msgs = []; addEventListener('message', (e) => window.msgs.push(e.data));</script>
</head>
<body>
  <iframe id="xfo" src="http://localhost:${port}${XFO_FRAME_PATH}" width="300" height="80"></iframe>
</body>
</html>
`;
}

// --- CORS -------------------------------------------------------------------------

/** An API on another site (`localhost`) with no CORS headers at all. */
export const API_JSON_PATH = '/headers/api.json';
export const API_JSON = `{"ok":true,"api":"json"}`;
/** The same API taking a PUT, whose preflight it refuses with 405. */
export const API_PUT_PATH = '/headers/api-put.json';
export const API_PUT = `{"ok":true,"api":"put"}`;
/** Redirects to API_JSON_PATH on the same site. */
export const API_REDIRECT_PATH = '/headers/api-redirect.json';

/**
 * A page on 127.0.0.1 reading the `localhost` API with credentials. Each call
 * returns what the page could read: the body, or `error: <message>`;
 * `callApi()` also shows it in #api, and runs once on load.
 */
export const CORS_PATH = '/headers/cors.html';

export function corsHtml(port: number): string {
  const api = `http://localhost:${port}`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CORS fixture</title>
</head>
<body>
  <h1>CORS fixture</h1>
  <pre id="api">loading</pre>
  <script>
    const read = async (url, init) => {
      try {
        const res = await fetch(url, { credentials: 'include', ...init });
        return await res.text();
      } catch (err) {
        return 'error: ' + err.message;
      }
    };
    window.callApi = async () => {
      const text = await read('${api}${API_JSON_PATH}');
      document.getElementById('api').textContent = text;
      return text;
    };
    window.putApi = () =>
      read('${api}${API_PUT_PATH}', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Custom': '1' }, body: JSON.stringify({ x: 1 }) });
    window.redirectApi = () => read('${api}${API_REDIRECT_PATH}');
    callApi();
  </script>
</body>
</html>
`;
}

// --- Routes -----------------------------------------------------------------------

const HTML = 'text/html; charset=utf-8';
const JAVASCRIPT = 'text/javascript';
const JSON_TYPE = 'application/json';
/** Every /headers/ response: never cached (a rule toggled between loads must apply), and no CORS headers of its own. */
const DEFAULTS: Record<string, string | null> = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': null };
const REDIRECT = 302;

/** The /headers/ routes, for a server on `port`. */
export function headersRoutes(port: number): Array<[string, FixtureRoute]> {
  const routes: Array<[string, FixtureRoute]> = [
    [TRACK_PATH, { type: HTML, body: TRACK_HTML }],
    [ANALYTICS_JS_PATH, { type: JAVASCRIPT, body: ANALYTICS_JS }],
    [TRACK_APP_JS_PATH, { type: JAVASCRIPT, body: TRACK_APP_JS }],
    [REDIRECT_JS_PATH, { type: 'text/plain', body: '', status: REDIRECT, headers: { Location: FINAL_JS_PATH } }],
    [FINAL_JS_PATH, { type: JAVASCRIPT, body: FINAL_JS }],
    [CSP_PATH, { type: HTML, body: CSP_HTML, headers: { 'Content-Security-Policy': SELF_ONLY_CSP } }],
    [ALLOWED_JS_PATH, { type: JAVASCRIPT, body: ALLOWED_JS }],
    [PLAIN_PATH, { type: HTML, body: PLAIN_HTML }],
    [PLAIN_SCRIPT_PATH, { type: 'text/plain', body: PLAIN_SCRIPT, headers: { 'X-Content-Type-Options': 'nosniff' } }],
    [SAME_JSON_PATH, { type: JSON_TYPE, body: SAME_JSON, headers: { 'Cache-Control': SAME_JSON_CACHE_CONTROL } }],
    [XFO_HOST_PATH, { type: HTML, body: xfoHostHtml(port) }],
    [XFO_FRAME_PATH, { type: HTML, body: XFO_FRAME_HTML, headers: { 'X-Frame-Options': 'DENY' } }],
    [CORS_PATH, { type: HTML, body: corsHtml(port) }],
    [API_JSON_PATH, { type: JSON_TYPE, body: API_JSON, headers: { 'X-Api': 'json' } }],
    [API_PUT_PATH, { type: JSON_TYPE, body: API_PUT, rejectPreflight: true }],
    [API_REDIRECT_PATH, { type: 'text/plain', body: '', status: REDIRECT, headers: { Location: API_JSON_PATH } }],
  ];
  return routes.map(([path, route]) => [path, { ...route, headers: { ...DEFAULTS, ...route.headers } }]);
}
