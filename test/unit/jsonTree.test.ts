/**
 * The JSON tree patch mode and quick edits work on: parsed losslessly (numbers as written, keys in
 * order, every value's offsets), written back compactly, diffed into edits and applied to another
 * document of the same shape.
 */
import { describe, expect, it } from 'vitest';
import { applyJsonEdits, diffJson, JsonSyntaxError, parseJson, stringifyJson, type JsonNode } from '../../src/shared/json';

const roundTrip = (text: string) => stringifyJson(parseJson(text));
const patch = (base: string, edited: string, live: string) => {
  const result = applyJsonEdits(parseJson(live), diffJson(parseJson(base), parseJson(edited)));
  return result && stringifyJson(result);
};

describe('parsing', () => {
  it('keeps numbers as written, keys in their order (integer-like ones too) and escapes decoded', () => {
    expect(roundTrip('{ "id": 9007199254740993, "b": 1.50, "2": true, "1": null, "s": "a\\"\\u00e9\\n" }')).toBe(
      '{"id":9007199254740993,"b":1.50,"2":true,"1":null,"s":"a\\"é\\n"}',
    );
    expect(roundTrip(' [ [], {}, -0.5e+10, "" ] ')).toBe('[[],{},-0.5e+10,""]');
  });

  it("records every value's and key's offsets", () => {
    const text = '{"a": [1, "x"]}';
    const root = parseJson(text);
    if (root.kind !== 'object') throw new Error('object expected');
    const [entry] = root.entries;
    expect(text.slice(entry!.keyStart, entry!.keyEnd)).toBe('"a"');
    expect(text.slice(entry!.value.start, entry!.value.end)).toBe('[1, "x"]');
    const items = (entry!.value as Extract<JsonNode, { kind: 'array' }>).items;
    expect(items.map((n) => text.slice(n.start, n.end))).toEqual(['1', '"x"']);
  });

  it.each([
    ['{"a":1,}', 'Expected a key'],
    ['[1 2]', 'Expected ","'],
    ['{"a" 1}', 'Expected ":"'],
    ['"open', 'Unterminated string'],
    ['01', 'Unexpected text after the value'],
    ['nul', 'Expected null'],
    ['"\\x"', 'Unknown escape'],
    ['', 'Unexpected end of text'],
  ])('refuses %j: %s', (text, message) => {
    expect(() => parseJson(text)).toThrow(JsonSyntaxError);
    expect(() => parseJson(text)).toThrow(message);
  });
});

describe('patching a live response', () => {
  it('changes only the members that were edited, and keeps the rest live', () => {
    expect(patch('{"name":"Ada","age":36,"role":"admin"}', '{"name":"A very long name indeed","age":36}', '{"name":"Grace","age":45,"role":"user","new":1}')).toBe(
      '{"name":"A very long name indeed","age":45,"new":1}',
    );
  });

  it('adds members, and nests into objects', () => {
    expect(patch('{"user":{"id":1}}', '{"user":{"id":1,"beta":true},"flag":null}', '{"user":{"id":2,"name":"B"}}')).toBe('{"user":{"id":2,"name":"B","beta":true},"flag":null}');
  });

  it('edits items of an array that kept its length, and replaces one whose length changed', () => {
    expect(patch('[{"n":1},{"n":2}]', '[{"n":1},{"n":20}]', '[{"n":5,"x":1},{"n":6}]')).toBe('[{"n":5,"x":1},{"n":20}]');
    expect(patch('{"items":[1,2,3]}', '{"items":[]}', '{"items":[4,5,6,7],"total":4}')).toBe('{"items":[],"total":4}');
  });

  it('replaces a value that changed kind, and the whole document when the root did', () => {
    expect(patch('{"a":{"b":1}}', '{"a":"gone"}', '{"a":{"b":2}}')).toBe('{"a":"gone"}');
    expect(patch('{"a":1}', '[1]', '{"a":2}')).toBe('[1]');
  });

  it('does nothing to a document when nothing was edited', () => {
    expect(diffJson(parseJson('{"a":[1,{"b":2}]}'), parseJson('{ "a" : [ 1 , { "b" : 2 } ] }'))).toEqual([]);
    expect(patch('{"a":1}', '{"a":1}', '{"a":2,"b":3}')).toBe('{"a":2,"b":3}');
  });

  it("gives up on a document the edits don't fit", () => {
    // The edited member is gone from the live response, or its parent is another kind now.
    expect(patch('{"a":{"b":1}}', '{"a":{"b":2}}', '{"x":1}')).toBeNull();
    expect(patch('{"a":[1,2]}', '{"a":[1,3]}', '{"a":{"0":1}}')).toBeNull();
    expect(patch('{"a":1,"b":2}', '{"b":2}', '{"b":2}')).toBeNull();
  });

  it('removes duplicates of a key it sets', () => {
    expect(patch('{"a":1}', '{"a":2}', '{"a":1,"a":3}')).toBe('{"a":2}');
  });
});
