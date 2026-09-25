import { describe, expect, it } from 'vitest';
import { compareRuleAge, sameRuleInput, validateHeaderEdit, validateRuleInput } from '../../src/shared/rules';
import type { CreateRuleInput, HeaderEdit } from '../../src/shared/types';

const match = { type: 'exact' as const, pattern: 'https://a.com/app.js', ignoreQuery: true };
const block: CreateRuleInput = { action: 'block', match, resourceTypes: [] };
const headers = (...edits: HeaderEdit[]): CreateRuleInput => ({ action: 'headers', match, resourceTypes: [], headers: edits });
const set = (name: string, value = 'v'): HeaderEdit => ({ operation: 'set', name, value });
const remove = (name: string, value = ''): HeaderEdit => ({ operation: 'remove', name, value });

describe('rule validation', () => {
  it('accepts well-formed rules of every action', () => {
    expect(validateRuleInput(block)).toBeNull();
    expect(validateRuleInput({ action: 'cors', match: { ...match, type: 'glob', pattern: 'https://api.test/*' }, resourceTypes: ['XHR'] })).toBeNull();
    expect(validateRuleInput(headers(remove('Content-Security-Policy'), set('Cache-Control', 'no-store')))).toBeNull();
  });

  it('refuses empty and broken patterns, and URLs requests never reach rules from', () => {
    expect(validateRuleInput({ ...block, match: { ...match, pattern: '  ' } })).toBe('Pattern is empty');
    expect(validateRuleInput({ ...block, match: { ...match, type: 'regex', pattern: '(' } })).toMatch(/Invalid regular expression/);
    for (const pattern of ['ws://a.com/socket', 'WSS://a.com/', 'data:text/plain,x', 'blob:https://a.com/1'])
      expect(validateRuleInput({ ...block, match: { ...match, pattern } })).toBe('Requests to ws:, data: and blob: URLs never reach rules');
    expect(validateRuleInput({ ...block, match: { ...match, type: 'glob', pattern: 'data:*' } })).not.toBeNull();
    // A regex is the user's to get right.
    expect(validateRuleInput({ ...block, match: { ...match, type: 'regex', pattern: '^data:' } })).toBeNull();
  });

  it('refuses unknown actions and request types', () => {
    expect(validateRuleInput({ ...block, action: 'redirect' } as never)).toBe('Unknown rule action');
    expect(validateRuleInput({ ...block, resourceTypes: ['Script', 'WebSocket'] } as never)).toBe('Unknown request type');
  });

  it('needs one to 32 header changes', () => {
    expect(validateRuleInput(headers())).toBe('Add at least one header change');
    expect(validateRuleInput(headers(...Array.from({ length: 33 }, (_, i) => set(`X-${i}`))))).toBe('A rule makes at most 32 header changes');
    expect(validateRuleInput(headers(...Array.from({ length: 32 }, (_, i) => set(`X-${i}`))))).toBeNull();
    // The first bad change is the one reported.
    expect(validateRuleInput(headers(set('Good'), set('bad name'), set('')))).toBe("Header names can't contain spaces or ':'");
  });

  it('checks header names', () => {
    expect(validateHeaderEdit(set(''))).toBe('Enter a header name');
    expect(validateHeaderEdit(set('X a'))).toBe("Header names can't contain spaces or ':'");
    expect(validateHeaderEdit(set('X:a'))).toBe("Header names can't contain spaces or ':'");
    expect(validateHeaderEdit(set('x'.repeat(257)))).toBe('Header names are at most 256 characters');
    expect(validateHeaderEdit(set('x'.repeat(256)))).toBeNull();
    expect(validateHeaderEdit({ operation: 'append', name: 'X', value: '' } as never)).toBe('Unknown header operation');
  });

  it('refuses headers a rule cannot change, in any case, with the reason', () => {
    expect(validateHeaderEdit(set('SET-COOKIE', 'a=1'))).toMatch(/stores cookies before a rule runs/);
    expect(validateHeaderEdit(remove('location'))).toMatch(/follows the server's redirect/);
    for (const name of ['Content-Encoding', 'content-length', 'Transfer-Encoding']) expect(validateHeaderEdit(remove(name))).toBe('The app frames response bodies itself');
  });

  it('checks values by operation', () => {
    for (const value of ['a\rb', 'a\nb', 'a\0b']) expect(validateHeaderEdit(set('X', value))).toBe("Header values can't contain line breaks");
    expect(validateHeaderEdit(set('X', 'v'.repeat(8193)))).toBe('Header values are at most 8192 characters');
    expect(validateHeaderEdit(set('X', ''))).toBeNull();
    expect(validateHeaderEdit(remove('X', 'v'))).toBe('A removed header takes no value');
  });

  it('compares rules by what they do, and orders them oldest first', () => {
    const a = headers(set('X', '1'), remove('Y'));
    expect(sameRuleInput(a, headers(set('X', '1'), remove('Y')))).toBe(true);
    expect(sameRuleInput(a, headers(remove('Y'), set('X', '1')))).toBe(false);
    expect(sameRuleInput(a, headers(set('X', '2'), remove('Y')))).toBe(false);
    expect(sameRuleInput(block, { ...block, match: { ...match, ignoreQuery: false } })).toBe(false);
    expect(sameRuleInput(block, { ...block, resourceTypes: ['Script'] })).toBe(false);
    expect(sameRuleInput(block, { action: 'cors', match, resourceTypes: [] })).toBe(false);
    expect(sameRuleInput(block, { ...block })).toBe(true);

    const rules = [
      { id: 'b', createdAt: 2 },
      { id: 'c', createdAt: 1 },
      { id: 'a', createdAt: 2 },
    ];
    expect(rules.sort(compareRuleAge).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});
