import { describe, expect, it } from 'vitest';
import beautify from 'js-beautify';
import { decodedMappings, TraceMap } from '@jridgewell/trace-mapping';
import { BEAUTIFY_OPTIONS } from '@/shared/lib/format/constants';
import { alignmentFor, codeOffsets, isAlignWhitespace, lineStarts, rawToView, viewToRaw } from '@/shared/lib/source-map/host/align';
import type { LoadedMap } from '@/shared/lib/source-map/host/types';
import { ESBUILD_APP_CSS, ESBUILD_APP_CSS_MAP, ESBUILD_APP_JS, ESBUILD_APP_JS_MAP } from '../fixtures/esbuildApp';
import { MAIN_JS, MAIN_JS_ANCHORS, STYLE_CSS, THEME_CSS } from '../fixtures/sourceMaps';

const code = (text: string) => text.split('').filter((c) => !isAlignWhitespace(c.charCodeAt(0))).join('');
const lineOf = (text: string, offset: number) => text.slice(0, offset).split('\n').length;

/** A map entry holding `raw`, as the worker keeps one, lined up with `view`. */
function lineUp(raw: string, view: string) {
  const entry = { raw, rawLineStarts: lineStarts(raw) } as LoadedMap;
  const alignment = alignmentFor(entry, raw, { key: 'view', text: view })!;
  return {
    toView: (offset: number) => rawToView(entry.rawCode!, alignment, offset),
    toRaw: (offset: number) => viewToRaw(entry.rawCode!, alignment, offset),
    alignment,
  };
}

describe('lining a pretty-printed tab up with the text its map describes', () => {
  it('js-beautify only changes whitespace in the fixture bundles and the esbuild app', () => {
    for (const [name, text, format] of [
      ['MAIN_JS', MAIN_JS, beautify.js],
      ['ESBUILD_APP_JS', ESBUILD_APP_JS, beautify.js],
      ['STYLE_CSS', STYLE_CSS, beautify.css],
      ['THEME_CSS', THEME_CSS, beautify.css],
      ['ESBUILD_APP_CSS', ESBUILD_APP_CSS, beautify.css],
    ] as const) {
      const pretty = format(text, BEAUTIFY_OPTIONS);
      expect(pretty, name).not.toBe(text);
      expect(code(pretty), name).toBe(code(text));
    }
  });

  it('counts exactly JavaScript whitespace plus U+180E as whitespace', () => {
    for (let c = 0; c <= 0xffff; c++) {
      const expected = /\s/.test(String.fromCharCode(c)) || c === 0x180e;
      if (isAlignWhitespace(c) !== expected) expect(c.toString(16)).toBe(`whitespace ${expected}`);
    }
  });

  it('every mapping of the esbuild app lands on the same character after pretty-printing, and comes back', () => {
    for (const [raw, map, format] of [
      [ESBUILD_APP_JS, ESBUILD_APP_JS_MAP, beautify.js],
      [ESBUILD_APP_CSS, ESBUILD_APP_CSS_MAP, beautify.css],
    ] as const) {
      const pretty = format(raw, BEAUTIFY_OPTIONS);
      const { toView, toRaw } = lineUp(raw, pretty);
      const starts = lineStarts(raw);
      let checked = 0;
      decodedMappings(new TraceMap(map)).forEach((segments, line) => {
        for (const [column] of segments) {
          const offset = starts[line]! + column;
          if (isAlignWhitespace(raw.charCodeAt(offset))) continue;
          const view = toView(offset);
          expect(view.fit).toBe('exact');
          expect(pretty[view.offset]).toBe(raw[offset]);
          expect(toRaw(view.offset)).toBe(offset);
          checked++;
        }
      });
      expect(checked).toBeGreaterThan(20);
    }
  });

  it('puts the MAIN_JS anchors on their pretty lines', () => {
    const pretty = beautify.js(MAIN_JS, BEAUTIFY_OPTIONS);
    const { toView } = lineUp(MAIN_JS, pretty);
    for (const anchor of MAIN_JS_ANCHORS) {
      expect(lineOf(pretty, toView(MAIN_JS.indexOf(anchor.snippet)).offset), anchor.snippet).toBe(anchor.prettyLine);
    }
  });

  it('is the identity for text that was not pretty-printed', () => {
    const { toView, toRaw } = lineUp(MAIN_JS, MAIN_JS);
    for (let offset = 0; offset < MAIN_JS.length; offset += 37) {
      expect(toView(offset)).toEqual({ offset, fit: 'exact' });
      if (!isAlignWhitespace(MAIN_JS.charCodeAt(offset))) expect(toRaw(offset)).toBe(offset);
    }
  });

  it("keeps a position inside a string's spaces, which pretty-printing leaves as they are", () => {
    const raw = 'x("a  b");y();';
    const pretty = 'x("a  b");\ny();\n';
    const { toView } = lineUp(raw, pretty);
    expect(toView(raw.indexOf('  ') + 1)).toEqual({ offset: pretty.indexOf('  ') + 1, fit: 'exact' });
  });

  it("snaps a cursor in indentation to the line's first token, and one past a line's end to its last", () => {
    const pretty = beautify.js(MAIN_JS, BEAUTIFY_OPTIONS);
    const { toRaw } = lineUp(MAIN_JS, pretty);
    const greet = pretty.indexOf('greet: function');
    const lineStart = pretty.lastIndexOf('\n', greet) + 1;
    expect(toRaw(lineStart)).toBe(MAIN_JS.indexOf('greet:function'));
    // After `version: "1.0.0",` on the line above: its last token, the comma.
    expect(toRaw(lineStart - 1)).toBe(MAIN_JS.indexOf('"1.0.0",') + '"1.0.0"'.length);
  });

  it('maps edits at the start, middle and end: exact outside them, edited inside', () => {
    const raw = 'aa();bb();cc();';
    for (const [view, inside, outside] of [
      ['zz();aa();bb();cc();', 'zz', 'cc'],
      ['aa();zz();bb();cc();', 'zz', 'bb'],
      ['aa();bb();cc();zz();', 'zz', 'aa'],
    ]) {
      const { toView, toRaw } = lineUp(raw, view);
      expect(toRaw(view.indexOf(inside!)), view).toBeNull();
      expect(toRaw(view.indexOf(outside!)), view).toBe(raw.indexOf(outside!));
      expect(toView(raw.indexOf(outside!)), view).toEqual({ offset: view.indexOf(outside!), fit: 'exact' });
    }
    // A change inside a token leaves both sides of it exact, and lands a jump into it at its start.
    const { toView } = lineUp(raw, 'aa();bX();cc();');
    expect(toView(raw.indexOf('b') + 1)).toEqual({ offset: 'aa();b'.length, fit: 'edited' });
    expect(toView(raw.indexOf('cc'))).toEqual({ offset: 'aa();bX();'.length, fit: 'exact' });
  });

  it('translates offsets like a naive scan, on random texts with their whitespace reshuffled', () => {
    let seed = 7;
    const random = (n: number) => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % n;
    const tokens = ['a', 'b', '"x y"', '{', '}', ';', ' ', ' ', '\n', '\t', ' ', '᠎'];
    for (let round = 0; round < 50; round++) {
      const raw = Array.from({ length: 200 }, () => tokens[random(tokens.length)]).join('');
      // Add or drop whitespace between code characters, as pretty-printing does.
      const view = raw.split('').map((c) => (isAlignWhitespace(c.charCodeAt(0)) ? ['', ' ', '\n  '][random(3)] : c + ['', ' ', '\n'][random(3)])).join('');
      const { toView, toRaw } = lineUp(raw, view);
      const rawCode = codeOffsets(raw);
      const viewCode = codeOffsets(view);
      expect(viewCode.length).toBe(rawCode.length);
      rawCode.forEach((offset, k) => {
        expect(toView(offset)).toEqual({ offset: viewCode[k], fit: 'exact' });
        expect(toRaw(viewCode[k]!)).toBe(offset);
      });
    }
  });
});
