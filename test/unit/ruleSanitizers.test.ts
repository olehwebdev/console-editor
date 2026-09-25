import { describe, expect, it } from 'vitest';
import { parseInput } from '../../src/main/store/parseInput';
import { rulePatchSchema } from '../../src/main/store/rulePatchSchema';
import { sanitizeStoredRule } from '../../src/main/store/sanitizeStoredRule';
import { toRule } from '../../src/main/store/toRule';
import { MAX_HEADER_EDITS, resourceTypesSchema, ruleInputSchema } from '../../src/shared/rules';

const match = { type: 'glob', pattern: 'https://a.com/*', ignoreQuery: true };
const edit = { operation: 'set', name: 'X-Mode', value: 'on' };
const parseRule = (input: unknown) => parseInput(ruleInputSchema, input, 'rule');
const parsePatch = (input: unknown) => parseInput(rulePatchSchema, input, 'rule');

describe('reading a rule to create (IPC)', () => {
  it("keeps only the known fields of the input's action, as fresh copies", () => {
    const input = { action: 'headers', match: { ...match, extra: 1 }, resourceTypes: ['Script'], headers: [{ ...edit, extra: 2 }], id: 'ffffffff', enabled: false, workspaceId: 'x' };
    const clean = parseRule(input);
    expect(clean).toEqual({ action: 'headers', match, resourceTypes: ['Script'], headers: [edit] });
    expect(clean.match).not.toBe(input.match);
    expect(parseRule({ action: 'block', match, resourceTypes: [], headers: [edit] })).toEqual({ action: 'block', match, resourceTypes: [] });
    expect(parseRule({ action: 'cors', match, resourceTypes: ['XHR'] })).toEqual({ action: 'cors', match, resourceTypes: ['XHR'] });
  });

  it('puts request types in their canonical order, once each', () => {
    expect(parseRule({ action: 'block', match, resourceTypes: ['XHR', 'Document', 'XHR', 'Script'] }).resourceTypes).toEqual(['Document', 'Script', 'XHR']);
  });

  it('names the field of the wrong shape, and says what is wrong with a value', () => {
    const valid = { action: 'headers', match, resourceTypes: [], headers: [edit] };
    const cases: Array<[unknown, string]> = [
      [null, 'Invalid rule: not an object'],
      [[valid], 'Invalid rule: not an object'],
      [{ ...valid, action: 'redirect' }, 'Unknown rule action'],
      [{ ...valid, match: 'https://a.com/' }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, type: 'prefix' } }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, pattern: 1 } }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, ignoreQuery: 'yes' } }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, pattern: ' ' } }, 'Pattern is empty'],
      [{ ...valid, resourceTypes: 'Script' }, 'Invalid rule: resourceTypes'],
      [{ ...valid, resourceTypes: ['Script', 'WebSocket'] }, 'Unknown request type'],
      [{ ...valid, headers: undefined }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, operation: 'append' }] }, 'Unknown header operation'],
      [{ ...valid, headers: [{ ...edit, name: 7 }] }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, value: null }] }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, name: 'Set-Cookie' }] }, "Set-Cookie can't be changed: the browser stores cookies before a rule runs"],
      [{ ...valid, headers: Array(MAX_HEADER_EDITS + 1).fill(edit) }, `A rule makes at most ${MAX_HEADER_EDITS} header changes`],
    ];
    for (const [input, message] of cases) expect(() => parseRule(input), JSON.stringify(input)).toThrow(message);
  });
});

describe('reading a rule edit (IPC)', () => {
  it('keeps only the fields present, as fresh copies', () => {
    expect(parsePatch({})).toEqual({});
    expect(parsePatch({ enabled: false, action: 'block', id: 'x' })).toEqual({ enabled: false });
    const patch = parsePatch({ match: { ...match, extra: 1 }, resourceTypes: ['Ping', 'Image'], headers: [edit] });
    expect(patch).toEqual({ match, resourceTypes: ['Image', 'Ping'], headers: [edit] });
    expect(Object.keys(parsePatch({ match }))).toEqual(['match']);
  });

  it('names the field of the wrong shape, and refuses a field given as undefined', () => {
    expect(() => parsePatch('x')).toThrow('Invalid rule: not an object');
    expect(() => parsePatch({ enabled: 'yes' })).toThrow('Invalid rule: enabled');
    expect(() => parsePatch({ enabled: undefined })).toThrow('Invalid rule: enabled');
    expect(() => parsePatch({ match: null })).toThrow('Invalid rule: match');
    expect(() => parsePatch({ resourceTypes: ['Nope'] })).toThrow('Unknown request type');
    expect(() => parsePatch({ headers: {} })).toThrow('Invalid rule: headers');
    expect(() => parsePatch({ headers: [] })).toThrow('Add at least one header change');
  });
});

describe('request types', () => {
  it('are known ones only, in order, once each', () => {
    expect(resourceTypesSchema.parse([])).toEqual([]);
    expect(resourceTypesSchema.safeParse(undefined).success).toBe(false);
    expect(resourceTypesSchema.parse(['Other', 'Document', 'Other'])).toEqual(['Document', 'Other']);
  });
});

describe('sanitizeStoredRule (disk)', () => {
  const stored = { workspaceId: 'aaaaaaaa', id: '0123abcd', action: 'block', match, resourceTypes: [], enabled: true, createdAt: 1, updatedAt: 2 };

  it('reads a rule from its known fields only', () => {
    expect(sanitizeStoredRule({ ...stored, note: 'hand edit' })).toEqual(stored);
    expect(sanitizeStoredRule({ ...stored, workspaceId: '' })).toEqual({ ...stored, workspaceId: '' });
    expect(toRule(sanitizeStoredRule(stored)!)).toEqual({ id: '0123abcd', action: 'block', match, resourceTypes: [], enabled: true, createdAt: 1, updatedAt: 2 });
  });

  it('refuses anything this build cannot use', () => {
    for (const bad of [
      { ...stored, id: 'XYZ' },
      { ...stored, workspaceId: 3 },
      { ...stored, action: 'redirect' },
      { ...stored, resourceTypes: ['WebSocket'] },
      { ...stored, enabled: 'true' },
      { ...stored, createdAt: Number.NaN },
      { ...stored, updatedAt: '2' },
      { ...stored, match: { ...match, pattern: '' } },
      { ...stored, action: 'headers', headers: [] },
      { ...stored, action: 'headers', headers: [{ operation: 'set', name: 'Set-Cookie', value: 'a=1' }] },
      'rule',
    ]) {
      expect(sanitizeStoredRule(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
