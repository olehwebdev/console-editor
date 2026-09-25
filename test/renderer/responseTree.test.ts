/**
 * The response tree's logic: the rows a JSON text shows for what is open, and the text edits the tree
 * makes (remove a member or item, add one), each keeping the rest of the text as typed: commas,
 * indentation and the space after a colon.
 */
import { describe, expect, it } from 'vitest';
import { parseJson, type TextEdit } from '../../src/shared/json';
import { appendChild, flattenJson, removeChild } from '@/shared/lib';
import { idAfterRemoval } from '@/features/network/response-tree/ui/ResponseTree/idAfterRemoval';
import { parentId } from '@/features/network/response-tree/ui/ResponseTree/parentId';

function applied(text: string, edits: TextEdit[]): string {
  return [...edits].sort((a, b) => b.start - a.start).reduce((out, e) => out.slice(0, e.start) + e.text + out.slice(e.end), text);
}

const TEXT = `{
  "user": { "name": "Ada", "a/b": 1 },
  "tags": ["x", "y"],
  "dup": 1,
  "dup": 2
}`;

describe('the rows', () => {
  it('show the open objects and arrays, each value with its key or index, depth and a unique id', () => {
    const rows = flattenJson(parseJson(TEXT), new Set(['', '/user', '/tags']));
    expect(rows.map((r) => [r.id, r.depth, r.key, r.node.kind, r.open])).toEqual([
      ['', 0, undefined, 'object', true],
      ['/user', 1, 'user', 'object', true],
      ['/user/name', 2, 'name', 'string', false],
      ['/user/a~1b', 2, 'a/b', 'number', false],
      ['/tags', 1, 'tags', 'array', true],
      ['/tags/0', 2, 0, 'string', false],
      ['/tags/1', 2, 1, 'string', false],
      ['/dup', 1, 'dup', 'number', false],
      ['/dup#3', 1, 'dup', 'number', false],
    ]);
    expect(rows[2]!.entry?.key).toBe('name');
    expect(rows[5]!.parent?.kind).toBe('array');
  });

  it('hide what a closed object holds', () => {
    expect(flattenJson(parseJson(TEXT), new Set([''])).map((r) => r.id)).toEqual(['', '/user', '/tags', '/dup', '/dup#3']);
    expect(flattenJson(parseJson('[]'), new Set([''])).map((r) => r.open)).toEqual([true]);
  });
});

describe('removing', () => {
  const root = parseJson(TEXT);
  const member = (i: number) => removeChild(root, i);

  it('takes the comma after a member, or before the last one', () => {
    expect(applied(TEXT, member(0))).toBe(TEXT.replace('"user": { "name": "Ada", "a/b": 1 },\n  ', ''));
    expect(applied(TEXT, member(3))).toBe(TEXT.replace(',\n  "dup": 2', ''));
  });

  it('leaves an emptied array or object empty', () => {
    const tags = parseJson('["x"]');
    expect(applied('["x"]', removeChild(tags, 0))).toBe('[]');
    expect(applied('{ "a": 1 }', removeChild(parseJson('{ "a": 1 }'), 0))).toBe('{}');
  });
});

describe('adding', () => {
  it('writes a new member as the last one is written: its line, indent and colon', () => {
    expect(applied(TEXT, appendChild(TEXT, parseJson(TEXT)))).toBe(TEXT.replace('"dup": 2\n}', '"dup": 2,\n  "key": null\n}'));
    expect(applied('{"a":1,"key":2}', appendChild('{"a":1,"key":2}', parseJson('{"a":1,"key":2}')))).toBe('{"a":1,"key":2,"key2":null}');
    expect(applied('[1, 2]', appendChild('[1, 2]', parseJson('[1, 2]')))).toBe('[1, 2, null]');
  });

  it('fills an empty one, and adds nothing to a value that holds none', () => {
    expect(applied('{}', appendChild('{}', parseJson('{}')))).toBe('{ "key": null }');
    expect(applied('[ ]', appendChild('[ ]', parseJson('[ ]')))).toBe('[null]');
    expect(appendChild('1', parseJson('1'))).toEqual([]);
  });
});

describe('the selection', () => {
  const rows = flattenJson(parseJson(TEXT), new Set(['', '/user', '/tags']));
  const row = (id: string) => rows.find((r) => r.id === id)!;

  it("moves to a row's parent", () => {
    expect(parentId('/user/name')).toBe('/user');
    expect(parentId('/user')).toBe('');
    expect(parentId('')).toBeUndefined();
  });

  it('goes to the next row once one is removed, else the one before, else the parent', () => {
    expect(idAfterRemoval(row('/user/name'))).toBe('/user/a~1b');
    expect(idAfterRemoval(row('/user/a~1b'))).toBe('/user/name');
    // An array's later items move up into the removed one's place.
    expect(idAfterRemoval(row('/tags/0'))).toBe('/tags/0');
    expect(idAfterRemoval(row('/tags/1'))).toBe('/tags/0');
    const single = flattenJson(parseJson('{"a":[1]}'), new Set(['', '/a']));
    expect(idAfterRemoval(single.find((r) => r.id === '/a/0')!)).toBe('/a');
  });
});
