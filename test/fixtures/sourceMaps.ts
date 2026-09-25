/**
 * The fixture site's bundles and their source maps, with nothing Node-specific in it, so renderer
 * tests can import it too (site.ts serves these and re-exports the moved texts).
 *
 * The maps are built from anchors: a snippet of the generated code, and the original line and
 * column it came from. Each anchor also says which line the snippet lands on once the app
 * pretty-prints the bundle, so tests can check jumps against what the user sees.
 */

/** A realistic minified bundle (one long line plus a source map comment). */
export const MAIN_JS =
  `(()=>{"use strict";var e={version:"1.0.0",greet:function(n){return"Hello, "+n},sum:function(n){return n.reduce(function(t,r){return t+r},0)},` +
  `clamp:function(n,t,r){return Math.min(Math.max(n,t),r)},debounce:function(n,t){var r;return function(){var o=this,u=arguments;clearTimeout(r),r=setTimeout(function(){n.apply(o,u)},t)}},` +
  `format:function(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)}};function t(n){var t=document.createElement("li");return t.textContent=n,t}` +
  `function r(n,r){var o=document.querySelector(n);o&&r.forEach(function(n){o.appendChild(t(n))})}var o=[{id:1,name:"Alpha",price:12.5},{id:2,name:"Beta",price:7.25},` +
  `{id:3,name:"Gamma",price:30}],u={items:o,total:e.sum(o.map(function(n){return n.price})),selected:null};function i(n){u.selected=o.find(function(t){return t.id===n})||null,` +
  `c()}function c(){var n=document.querySelector("#main");n&&(n.textContent=e.greet("world")+" · "+o.length+" items · total "+e.format(u.total)+(u.selected?" · selected "+u.selected.name:""))}` +
  `window.mainValue="original-main",window.lib=e,window.store=u,window.select=i,document.addEventListener("DOMContentLoaded",function(){c(),r("#list",o.map(function(n){return n.name}))})})();\n` +
  `//# sourceMappingURL=main.3f9a1c2b.js.map\n`;

export const STYLE_CSS = `body{font-family:sans-serif;color:rgb(0, 0, 0)}#app{padding:8px;border:1px solid #ccc}\n`;

// --- building maps -----------------------------------------------------------------------------

export interface MapSource {
  url: string;
  /** Its text as the map carries it (`sourcesContent`); null when the map leaves it out. */
  content: string | null;
}

/**
 * One mapping: where `snippet` first appears in the generated code came from `source` (an index
 * into the sources) at `line` (1-based) and `column` (0-based).
 */
export interface MapAnchor {
  snippet: string;
  source: number;
  line: number;
  column: number;
  /** The line the snippet starts on once the app pretty-prints the generated code (1-based). */
  prettyLine?: number;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 VLQ, the source map encoding: sign in the lowest bit, 5 bits per digit, continuation in the 6th. */
export function encodeVlq(values: number[]): string {
  let out = '';
  for (const value of values) {
    let rest = value < 0 ? (-value << 1) | 1 : value << 1;
    do {
      let digit = rest & 31;
      rest >>>= 5;
      if (rest > 0) digit |= 32;
      out += BASE64[digit];
    } while (rest > 0);
  }
  return out;
}

/** A version 3 source map of `generated` with one segment per anchor, as JSON. */
export function buildSourceMap(generated: string, sources: MapSource[], anchors: MapAnchor[], extra: Record<string, unknown> = {}): string {
  const segments = anchors
    .map((anchor) => {
      const offset = generated.indexOf(anchor.snippet);
      if (offset === -1) throw new Error(`Anchor not in the generated code: ${anchor.snippet}`);
      const line = generated.slice(0, offset).split('\n').length - 1;
      return { line, column: offset - (generated.lastIndexOf('\n', offset - 1) + 1), anchor };
    })
    .sort((a, b) => a.line - b.line || a.column - b.column);
  const lines: string[] = Array.from({ length: generated.split('\n').length }, () => '');
  let previous = { source: 0, line: 0, column: 0 };
  let lastLine = -1;
  let lastColumn = 0;
  for (const { line, column, anchor } of segments) {
    if (line !== lastLine) lastColumn = 0;
    const original = { source: anchor.source, line: anchor.line - 1, column: anchor.column };
    const encoded = encodeVlq([column - lastColumn, original.source - previous.source, original.line - previous.line, original.column - previous.column]);
    lines[line] += (lines[line] && line === lastLine ? ',' : '') + encoded;
    previous = original;
    lastLine = line;
    lastColumn = column;
  }
  return JSON.stringify({
    version: 3,
    sources: sources.map((s) => s.url),
    sourcesContent: sources.map((s) => s.content),
    names: [],
    mappings: lines.join(';').replace(/;+$/, ''),
    ...extra,
  });
}

// --- main.3f9a1c2b.js --------------------------------------------------------------------------

const LIB_TS = `export const lib = {
  version: '1.0.0',
  greet(name: string): string {
    return 'Hello, ' + name;
  },
  sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  },
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },
  debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
    let timer: ReturnType<typeof setTimeout>;
    return function (this: unknown, ...args: A) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  },
  format(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },
};
`;

const DOM_TS = `/** A list item showing \`text\`. */
export function listItem(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.textContent = text;
  return item;
}

export function renderList(selector: string, names: string[]): void {
  const list = document.querySelector(selector);
  if (list) names.forEach((name) => list.appendChild(listItem(name)));
}
`;

const STORE_TS = `import { lib } from './lib';

export interface Item {
  id: number;
  name: string;
  price: number;
}

export const items: Item[] = [
  { id: 1, name: 'Alpha', price: 12.5 },
  { id: 2, name: 'Beta', price: 7.25 },
  { id: 3, name: 'Gamma', price: 30 },
];

export const store = {
  items,
  total: lib.sum(items.map((item) => item.price)),
  selected: null as Item | null,
};
`;

const MAIN_TS = `import { lib } from './lib';
import { renderList } from './dom';
import { items, store } from './store';

export function select(id: number): void {
  store.selected = items.find((item) => item.id === id) ?? null;
  render();
}

function render(): void {
  // The greeting, how many items there are, and what they cost.
  const main = document.querySelector('#main');
  if (!main) return;
  main.textContent = \`\${lib.greet('world')} · \${items.length} items · total \${lib.format(store.total)}\` + (store.selected ? \` · selected \${store.selected.name}\` : '');
}

Object.assign(window, { mainValue: 'original-main', lib, store, select });
document.addEventListener('DOMContentLoaded', () => {
  render();
  renderList('#list', items.map((item) => item.name));
});
`;

/** What main.3f9a1c2b.js was built from, as its map lists them (webpack-style URLs, one without text). */
export const MAIN_JS_SOURCES: MapSource[] = [
  { url: 'webpack://fixture/./src/lib.ts', content: LIB_TS },
  { url: 'webpack://fixture/./src/dom.ts', content: DOM_TS },
  { url: 'webpack://fixture/./src/store.ts', content: STORE_TS },
  { url: 'webpack://fixture/./src/main.ts', content: MAIN_TS },
  { url: 'webpack://fixture/webpack/bootstrap', content: null },
];

/** The index of each source in {@link MAIN_JS_SOURCES}. */
export const MAIN_SOURCE = { lib: 0, dom: 1, store: 2, main: 3, bootstrap: 4 } as const;

export const MAIN_JS_ANCHORS: MapAnchor[] = [
  { snippet: '(()=>{"use strict";', source: MAIN_SOURCE.bootstrap, line: 1, column: 0, prettyLine: 1 },
  { snippet: 'version:"1.0.0"', source: MAIN_SOURCE.lib, line: 2, column: 2, prettyLine: 4 },
  { snippet: 'greet:function', source: MAIN_SOURCE.lib, line: 3, column: 2, prettyLine: 5 },
  { snippet: 'return"Hello, "', source: MAIN_SOURCE.lib, line: 4, column: 4, prettyLine: 6 },
  { snippet: 'sum:function', source: MAIN_SOURCE.lib, line: 6, column: 2, prettyLine: 8 },
  { snippet: 'return n.reduce', source: MAIN_SOURCE.lib, line: 7, column: 4, prettyLine: 9 },
  { snippet: 'clamp:function', source: MAIN_SOURCE.lib, line: 9, column: 2, prettyLine: 13 },
  { snippet: 'return Math.min', source: MAIN_SOURCE.lib, line: 10, column: 4, prettyLine: 14 },
  { snippet: 'debounce:function', source: MAIN_SOURCE.lib, line: 12, column: 2, prettyLine: 16 },
  { snippet: 'clearTimeout(r)', source: MAIN_SOURCE.lib, line: 15, column: 6, prettyLine: 21 },
  { snippet: 'format:function', source: MAIN_SOURCE.lib, line: 19, column: 2, prettyLine: 26 },
  { snippet: 'return new Intl', source: MAIN_SOURCE.lib, line: 20, column: 4, prettyLine: 27 },
  { snippet: 'function t(n){', source: MAIN_SOURCE.dom, line: 2, column: 0, prettyLine: 34 },
  { snippet: 'var t=document.createElement', source: MAIN_SOURCE.dom, line: 3, column: 2, prettyLine: 35 },
  { snippet: 'function r(n,r){', source: MAIN_SOURCE.dom, line: 8, column: 0, prettyLine: 39 },
  { snippet: 'var o=document.querySelector(n)', source: MAIN_SOURCE.dom, line: 9, column: 2, prettyLine: 40 },
  { snippet: 'o&&r.forEach', source: MAIN_SOURCE.dom, line: 10, column: 2, prettyLine: 41 },
  { snippet: 'var o=[{id:1', source: MAIN_SOURCE.store, line: 9, column: 0, prettyLine: 45 },
  { snippet: 'u={items:o', source: MAIN_SOURCE.store, line: 15, column: 0, prettyLine: 58 },
  { snippet: 'total:e.sum', source: MAIN_SOURCE.store, line: 17, column: 2, prettyLine: 60 },
  { snippet: 'function i(n){', source: MAIN_SOURCE.main, line: 5, column: 0, prettyLine: 66 },
  { snippet: 'u.selected=o.find', source: MAIN_SOURCE.main, line: 6, column: 2, prettyLine: 67 },
  { snippet: 'function c(){', source: MAIN_SOURCE.main, line: 10, column: 0, prettyLine: 72 },
  { snippet: 'var n=document.querySelector("#main")', source: MAIN_SOURCE.main, line: 12, column: 2, prettyLine: 73 },
  { snippet: 'n&&(n.textContent=', source: MAIN_SOURCE.main, line: 14, column: 2, prettyLine: 74 },
  { snippet: 'window.mainValue=', source: MAIN_SOURCE.main, line: 17, column: 0, prettyLine: 76 },
  { snippet: 'document.addEventListener("DOMContentLoaded"', source: MAIN_SOURCE.main, line: 18, column: 0, prettyLine: 76 },
  { snippet: 'c(),r("#list"', source: MAIN_SOURCE.main, line: 19, column: 2, prettyLine: 77 },
];

/** Served at `${MAIN_JS_PATH}.map`; the bootstrap source has no text and is ignore-listed, as webpack does. */
export const MAIN_JS_MAP = buildSourceMap(MAIN_JS, MAIN_JS_SOURCES, MAIN_JS_ANCHORS, { file: 'main.3f9a1c2b.js', sourceRoot: '', x_google_ignoreList: [MAIN_SOURCE.bootstrap] });

// --- /maps.html: a map named every way there is ------------------------------------------------

export const MAPS_PATH = {
  page: '/maps.html',
  /** A header and a comment naming different maps: scripts follow the header. */
  both: '/maps/both.js',
  /** Only the deprecated X-SourceMap header. */
  legacy: '/maps/legacy.js',
  /** An inline data: map (site.ts appends the base64 comment). */
  inline: '/maps/inline.js',
  /** A stylesheet whose comment and header name different maps: stylesheets follow the comment. */
  theme: '/maps/theme.css',
  /** Its map is a 404. */
  missing: '/maps/missing.js',
  /** Its map URL answers with an HTML page. */
  html: '/maps/html.js',
  /** Its map starts with the )]}' anti-XSSI line. */
  xssi: '/maps/xssi.js',
} as const;

export const MAPS_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Source maps</title>
  <link rel="stylesheet" href="${MAPS_PATH.theme}">
  <script src="${MAPS_PATH.both}"></script>
  <script src="${MAPS_PATH.legacy}"></script>
  <script src="${MAPS_PATH.inline}"></script>
  <script src="${MAPS_PATH.missing}"></script>
  <script src="${MAPS_PATH.html}"></script>
  <script src="${MAPS_PATH.xssi}"></script>
</head>
<body>
  <h1 class="title">Source maps</h1>
  <p class="note">Each script names its source map a different way.</p>
</body>
</html>
`;

/** A tiny bundle of `url` (one statement per original line) and its map. */
function tinyBundle(url: string, value: string, reference: string): { code: string; map: string; source: MapSource } {
  const source = { url, content: `// ${value}\nexport const value = '${value}';\nwindow.${value} = value;\n` };
  const code = `(()=>{var v="${value}";window.${value}=v})();\n${reference}`;
  const anchors: MapAnchor[] = [
    { snippet: `var v=`, source: 0, line: 2, column: 0 },
    { snippet: `window.${value}=`, source: 0, line: 3, column: 0 },
  ];
  return { code, map: buildSourceMap(code, [source], anchors), source };
}

const both = tinyBundle('src/both.ts', 'bothValue', '//# sourceMappingURL=wrong.js.map\n');
export const BOTH_JS = both.code;
export const BOTH_JS_MAP = both.map;

const legacy = tinyBundle('src/legacy.ts', 'legacyValue', '');
export const LEGACY_JS = legacy.code;
export const LEGACY_JS_MAP = legacy.map;

const inline = tinyBundle('src/inline.ts', 'inlineValue', '');
/** site.ts appends `//# sourceMappingURL=data:application/json;charset=utf-8;base64,…` of {@link INLINE_JS_MAP}. */
export const INLINE_JS_CODE = inline.code;
export const INLINE_JS_MAP = inline.map;

const missing = tinyBundle('src/missing.ts', 'missingValue', '//# sourceMappingURL=missing.js.map\n');
export const MISSING_JS = missing.code;

const html = tinyBundle('src/html.ts', 'htmlValue', '//# sourceMappingURL=html.js.map\n');
export const HTML_JS = html.code;

const xssi = tinyBundle('src/xssi.ts', 'xssiValue', '//# sourceMappingURL=xssi.js.map\n');
export const XSSI_JS = xssi.code;
/** Served after a `)]}'` line. */
export const XSSI_JS_MAP = xssi.map;

const THEME_SCSS = `$accent: #3b82f6;

.title {
  color: $accent;
  font-weight: 600;
}

.note {
  color: rgb(90, 90, 90);
  border-left: 3px solid $accent;
  padding-left: 12px;
}
`;

/** Minified (one line of at least 300 characters, so the app pretty-prints it). */
export const THEME_CSS =
  `body{margin:0;padding:24px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5;background:#fafafa}` +
  `.title{color:#3b82f6;font-weight:600}.note{color:rgb(90, 90, 90);border-left:3px solid #3b82f6;padding-left:12px}` +
  `a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}code{font-family:ui-monospace,monospace}\n` +
  `/*# sourceMappingURL=theme.css.map */\n`;

export const THEME_CSS_SOURCES: MapSource[] = [{ url: '../scss/theme.scss', content: THEME_SCSS }];

export const THEME_CSS_MAP = buildSourceMap(THEME_CSS, THEME_CSS_SOURCES, [
  { snippet: '.title{', source: 0, line: 3, column: 0 },
  { snippet: 'color:#3b82f6;font', source: 0, line: 4, column: 2 },
  { snippet: '.note{', source: 0, line: 8, column: 0 },
  { snippet: 'border-left:3px', source: 0, line: 10, column: 2 },
]);
