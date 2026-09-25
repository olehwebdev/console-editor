/**
 * Quick edits for UI states on a response tab: each is a set of text edits that change only what they
 * must, so the rest of the JSON stays as typed (spacing, numbers, key order). And the response row's
 * Patch live setting through its form.
 */
import { describe, expect, it, vi } from 'vitest';
import type { TextEdit } from '../../src/shared/json';
import { emptyArrays, lengthenStrings, nullAt } from '@/shared/lib';
import { fromForm, sameResponseRule, toForm } from '@/features/edit-response-rule/model';

vi.mock('@/shared/api', () => ({ api: {}, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/monaco', () => ({ getActiveEditor: () => null, setModelSchema: () => {}, dismissEditorWidgets: () => {} }));

/** A text with the edits applied, last first so offsets hold. */
function applied(text: string, edits: TextEdit[]): string {
  return [...edits].sort((a, b) => b.start - a.start).reduce((out, e) => out.slice(0, e.start) + e.text + out.slice(e.end), text);
}

const TEXT = `{
  "user": { "name": "Ada", "id": 9007199254740993, "avatar": "https://cdn.test/a.png" },
  "orders": [ { "sku": "A1", "tags": ["x"] }, { "sku": "B2", "tags": [] } ],
  "empty": [],
  "joined": "2024-01-02T10:00:00Z"
}`;

describe('quick edits', () => {
  it('empties every list, the outermost ones, and leaves everything else as typed', () => {
    expect(applied(TEXT, emptyArrays(TEXT))).toBe(TEXT.replace('[ { "sku": "A1", "tags": ["x"] }, { "sku": "B2", "tags": [] } ]', '[]'));
    expect(applied('[1, [2]]', emptyArrays('[1, [2]]'))).toBe('[]');
    expect(emptyArrays('{"a":[]}')).toEqual([]);
  });

  it('lengthens every text but keys, links, ids and dates', () => {
    const out = JSON.parse(applied(TEXT, lengthenStrings(TEXT)));
    expect(out.user.name.startsWith('Ada Lorem ipsum')).toBe(true);
    expect(out.user.name.length).toBeGreaterThanOrEqual(80);
    expect(out.orders[0].sku.length).toBeGreaterThanOrEqual(80);
    expect(out.user.avatar).toBe('https://cdn.test/a.png');
    expect(out.joined).toBe('2024-01-02T10:00:00Z');
    // Numbers are left as written.
    expect(applied(TEXT, lengthenStrings(TEXT))).toContain('"id": 9007199254740993');
  });

  it('nulls the value at the cursor: the innermost there, or the value of the key there', () => {
    const at = (needle: string) => TEXT.indexOf(needle) + 1;
    expect(applied(TEXT, nullAt(TEXT, at('Ada')))).toContain('"name": null, "id"');
    expect(applied(TEXT, nullAt(TEXT, at('"orders"')))).toContain('"orders": null,');
    expect(applied(TEXT, nullAt(TEXT, at('"x"')))).toContain('"tags": [null]');
    expect(nullAt('{"a":null}', 6)).toEqual([]);
  });

  it("throws for text that isn't JSON", () => {
    expect(() => emptyArrays('{ nope')).toThrow();
  });
});

describe('Patch live in the response row', () => {
  it('goes through the form and counts as a change', () => {
    const saved = { request: { method: 'GET', operation: '' }, response: { status: 200, delayMs: 0, headers: [], send: true, patch: false } };
    const form = { ...toForm(saved), patch: true };
    expect(fromForm(form).response).toEqual({ ...saved.response, patch: true });
    expect(sameResponseRule(fromForm(form), saved)).toBe(false);
    expect(sameResponseRule(fromForm(toForm(saved)), saved)).toBe(true);
  });
});
