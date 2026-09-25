import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceEntry, Rule } from '../../src/shared/types';
import { selectUniqueResources, useResourceStore } from '@/entities/resource';
import { FILES_REFRESH_MS, watchPageFiles } from '@/widgets/command-palette/model/files';
import { NEW_RULE_ITEM_PREFIX, OVERRIDE_ITEM_PREFIX, RULE_ITEM_PREFIX, WORKSPACE_ITEM_PREFIX } from '@/widgets/command-palette/ui/constants';
import { newRuleItems } from '@/widgets/command-palette/ui/newRuleItems';
import { ruleItems } from '@/widgets/command-palette/ui/ruleItems';

vi.mock('@/shared/api', () => ({ api: {}, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({ monaco: { editor: {}, Uri: { from: () => ({}) } }, languageFor: () => 'javascript' }));

const res = (url: string): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200 });
const add = (url: string) => useResourceStore.getState().add(res(url));
const current = () => selectUniqueResources(useResourceStore.getState());

describe('command palette: page files while open', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useResourceStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it('catches up with files that arrive while open, once per refresh interval', () => {
    const onChange = vi.fn();
    const off = watchPageFiles(current(), onChange);
    for (let i = 0; i < 50; i++) add(`https://site.test/${i}.js`);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FILES_REFRESH_MS);
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
  });

  it('notices files that arrived between reading the list and subscribing', () => {
    const shown = current();
    add('https://site.test/late.js');
    const onChange = vi.fn();
    const off = watchPageFiles(shown, onChange);

    vi.advanceTimersByTime(FILES_REFRESH_MS);
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
  });

  it('stays quiet when nothing changed, and after unsubscribing', () => {
    add('https://site.test/a.js');
    const onChange = vi.fn();
    const off = watchPageFiles(current(), onChange);
    vi.advanceTimersByTime(FILES_REFRESH_MS);
    expect(onChange).not.toHaveBeenCalled();

    add('https://site.test/b.js');
    off();
    vi.advanceTimersByTime(FILES_REFRESH_MS);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('command palette: rules', () => {
  const rule = (id: string, enabled = true): Rule => ({
    id,
    action: 'block',
    match: { type: 'glob', pattern: `https://${id}.test/*`, ignoreQuery: true },
    resourceTypes: [],
    enabled,
    createdAt: 0,
    updatedAt: 0,
  });

  it('gives each rule an open and a toggle item, whose ids never collide with an override’s or a workspace’s', () => {
    // An override, a rule and a workspace sharing an id (they are random, and could).
    const id = 'a1b2c3d4';
    const items = ruleItems([rule(id), rule('e5f6a7b8', false)]);
    expect(items.map((i) => i.id)).toEqual([`rule-open-${id}`, `rule-toggle-${id}`, 'rule-open-e5f6a7b8', 'rule-toggle-e5f6a7b8']);
    expect(items[0]).toMatchObject({ label: 'https://a1b2c3d4.test/*', keywords: expect.arrayContaining(['https://a1b2c3d4.test/*', 'Block']) });
    expect(items[1]!.label).toMatch(/^Turn off rule/);
    expect(items[3]!.label).toMatch(/^Turn on rule/);

    const others = [...Object.values(OVERRIDE_ITEM_PREFIX), WORKSPACE_ITEM_PREFIX].map((prefix) => `${prefix}${id}`);
    for (const item of items) expect(others).not.toContain(item.id);
    expect(RULE_ITEM_PREFIX).toEqual({ open: 'rule-open-', toggle: 'rule-toggle-' });
  });

  it('offers a new rule of each kind, found by what it is for', () => {
    const items = newRuleItems();
    expect(items.map((i) => i.label)).toEqual(['Block requests…', 'Change response headers…', 'Allow cross-origin requests…']);
    expect(items.every((i) => i.id.startsWith(NEW_RULE_ITEM_PREFIX))).toBe(true);
    const keywords = items.flatMap((i) => i.keywords ?? []);
    for (const word of ['block', 'analytics', 'ads', 'cors', 'csp', 'headers', 'cache']) expect(keywords).toContain(word);
  });
});
