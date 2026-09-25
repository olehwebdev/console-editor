import { describe, expect, it } from 'vitest';
import { sanitizeHeaderEdits } from '../../src/main/store/sanitizeHeaderEdits';
import { sanitizeMatcher } from '../../src/main/store/sanitizeMatcher';
import { sanitizeResourceTypes } from '../../src/main/store/sanitizeResourceTypes';
import { sanitizeRuleInput } from '../../src/main/store/sanitizeRuleInput';
import { sanitizeRulePatch } from '../../src/main/store/sanitizeRulePatch';
import { sanitizeStoredRule } from '../../src/main/store/sanitizeStoredRule';
import { toRule } from '../../src/main/store/toRule';
import { MAX_HEADER_EDITS } from '../../src/shared/rules';

const match = { type: 'glob', pattern: 'https://a.com/*', ignoreQuery: true };
const edit = { operation: 'set', name: 'X-Mode', value: 'on' };

describe('sanitizeRuleInput (IPC)', () => {
  it("keeps only the known fields of the input's action, as fresh copies", () => {
    const input = { action: 'headers', match: { ...match, extra: 1 }, resourceTypes: ['Script'], headers: [{ ...edit, extra: 2 }], id: 'ffffffff', enabled: false, workspaceId: 'x' };
    const clean = sanitizeRuleInput(input);
    expect(clean).toEqual({ action: 'headers', match, resourceTypes: ['Script'], headers: [edit] });
    expect(clean.match).not.toBe(input.match);
    expect(sanitizeRuleInput({ action: 'block', match, resourceTypes: [], headers: [edit] })).toEqual({ action: 'block', match, resourceTypes: [] });
    expect(sanitizeRuleInput({ action: 'cors', match, resourceTypes: ['XHR'] })).toEqual({ action: 'cors', match, resourceTypes: ['XHR'] });
  });

  it('puts request types in their canonical order, once each', () => {
    expect(sanitizeRuleInput({ action: 'block', match, resourceTypes: ['XHR', 'Document', 'XHR', 'Script'] }).resourceTypes).toEqual(['Document', 'Script', 'XHR']);
  });

  it('names the field of the wrong shape', () => {
    const valid = { action: 'headers', match, resourceTypes: [], headers: [edit] };
    const cases: Array<[unknown, string]> = [
      [null, 'Invalid rule: not an object'],
      [[valid], 'Invalid rule: not an object'],
      [{ ...valid, action: 'redirect' }, 'Invalid rule: action'],
      [{ ...valid, match: 'https://a.com/' }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, type: 'prefix' } }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, pattern: 1 } }, 'Invalid rule: match'],
      [{ ...valid, match: { ...match, ignoreQuery: 'yes' } }, 'Invalid rule: match'],
      [{ ...valid, resourceTypes: 'Script' }, 'Invalid rule: resourceTypes'],
      [{ ...valid, resourceTypes: ['Script', 'WebSocket'] }, 'Invalid rule: resourceTypes'],
      [{ ...valid, headers: undefined }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, operation: 'append' }] }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, name: 7 }] }, 'Invalid rule: headers'],
      [{ ...valid, headers: [{ ...edit, value: null }] }, 'Invalid rule: headers'],
      [{ ...valid, headers: Array(MAX_HEADER_EDITS + 1).fill(edit) }, 'Invalid rule: headers'],
    ];
    for (const [input, message] of cases) expect(() => sanitizeRuleInput(input), JSON.stringify(input)).toThrow(message);
  });
});

describe('sanitizeRulePatch (IPC)', () => {
  it('keeps only the fields present, as fresh copies', () => {
    expect(sanitizeRulePatch({})).toEqual({});
    expect(sanitizeRulePatch({ enabled: false, action: 'block', id: 'x' })).toEqual({ enabled: false });
    const patch = sanitizeRulePatch({ match: { ...match, extra: 1 }, resourceTypes: ['Ping', 'Image'], headers: [edit] });
    expect(patch).toEqual({ match, resourceTypes: ['Image', 'Ping'], headers: [edit] });
    expect(Object.keys(sanitizeRulePatch({ match }))).toEqual(['match']);
  });

  it('names the field of the wrong shape', () => {
    expect(() => sanitizeRulePatch('x')).toThrow('Invalid rule: not an object');
    expect(() => sanitizeRulePatch({ enabled: 'yes' })).toThrow('Invalid rule: enabled');
    expect(() => sanitizeRulePatch({ match: null })).toThrow('Invalid rule: match');
    expect(() => sanitizeRulePatch({ resourceTypes: ['Nope'] })).toThrow('Invalid rule: resourceTypes');
    expect(() => sanitizeRulePatch({ headers: {} })).toThrow('Invalid rule: headers');
  });
});

describe('field sanitizers', () => {
  it('return null for anything of the wrong shape', () => {
    expect(sanitizeMatcher(match)).toEqual(match);
    expect(sanitizeMatcher(undefined)).toBeNull();
    expect(sanitizeResourceTypes([])).toEqual([]);
    expect(sanitizeResourceTypes(undefined)).toBeNull();
    expect(sanitizeHeaderEdits([])).toEqual([]);
    expect(sanitizeHeaderEdits([null])).toBeNull();
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
