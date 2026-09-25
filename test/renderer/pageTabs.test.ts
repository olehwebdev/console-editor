import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateRuleInput } from '../../src/shared/types';
import { isPageDirty, PAGE_SCOPES, type PageTab, type RulePageDraft, type TabMeta, useTabStore } from '@/entities/editor-tab';
import { closeTab } from '@/features/close-tab';
import { closeSessionTabs } from '@/pages/editor/model/session';

const confirm = vi.hoisted(() => vi.fn(async (_options: { title: string }) => true));

vi.mock('@/shared/api', () => ({ api: {}, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({ dispose: () => {} }) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  setModelSchema: () => {},
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

const INPUT: CreateRuleInput = { action: 'block', match: { type: 'glob', pattern: 'https://ads.test/*', ignoreQuery: true }, resourceTypes: [] };
const DRAFT: RulePageDraft = { base: INPUT, value: { ...INPUT, resourceTypes: ['Script'] }, rowKeys: [] };
const WHATS_NEW: PageTab = { id: 'page:whats-new', page: 'whats-new', title: "What's New" };
const rulePage = (ruleId: string, draft?: RulePageDraft): PageTab => ({ id: `page:rule:${ruleId}`, page: 'rule', ruleId, title: ruleId, ...(draft ? { draft } : {}) });
const newRulePage = (id: string, draft?: RulePageDraft): PageTab => ({ id: `page:new-rule:${id}`, page: 'new-rule', seed: INPUT, title: 'New block requests', ...(draft ? { draft } : {}) });
const file = (id: string): TabMeta => ({ id, url: `https://site.test/${id}.js`, kind: 'Script', originalHash: null, lite: false, dirty: false, saving: false });
const pageIds = () => useTabStore.getState().pages.map((p) => p.id);

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
});

describe('page tabs', () => {
  it('opening an open page updates it in place, keeping its position and draft, and brings it to front', () => {
    const tabs = useTabStore.getState();
    tabs.openPage(rulePage('r1', DRAFT));
    tabs.openPage(rulePage('r2'));
    tabs.openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'renamed' });

    expect(pageIds()).toEqual(['page:rule:r1', 'page:rule:r2']);
    expect(useTabStore.getState().pages[0]).toEqual({ ...rulePage('r1', DRAFT), title: 'renamed' });
    expect(useTabStore.getState().activeId).toBe('page:rule:r1');
  });

  it('keeps a rule page’s draft, and drops it with undefined; What’s New takes none', () => {
    const tabs = useTabStore.getState();
    tabs.openPage(WHATS_NEW);
    tabs.openPage(rulePage('r1'));
    const before = useTabStore.getState().pages;

    tabs.setPageDraft('page:rule:r1', DRAFT);
    expect(useTabStore.getState().pages[1]).toMatchObject({ draft: DRAFT });
    tabs.setPageDraft('page:rule:r1', undefined);
    expect(isPageDirty(useTabStore.getState().pages[1]!)).toBe(false);

    const unchanged = useTabStore.getState().pages;
    tabs.setPageDraft('page:rule:r1', undefined);
    tabs.setPageDraft(WHATS_NEW.id, DRAFT);
    tabs.setPageDraft('page:rule:gone', DRAFT);
    expect(useTabStore.getState().pages).toBe(unchanged);
    expect(unchanged).not.toBe(before);
  });

  it('closes several pages at once; the neighbour of the active one takes over, as when closing one', () => {
    useTabStore.setState({ tabs: [file('a')], pages: [WHATS_NEW, rulePage('r1'), rulePage('r2'), newRulePage('n1')], activeId: 'page:rule:r2' });
    useTabStore.getState().removePages(['page:rule:r1', 'page:rule:r2']);
    expect(pageIds()).toEqual([WHATS_NEW.id, 'page:new-rule:n1']);
    expect(useTabStore.getState().activeId).toBe('page:new-rule:n1');

    // None after it: the last one before it.
    useTabStore.getState().removePages(['page:new-rule:n1']);
    expect(useTabStore.getState().activeId).toBe(WHATS_NEW.id);

    // An inactive page goes without moving the active one; unknown ids change nothing.
    useTabStore.setState({ pages: [WHATS_NEW, rulePage('r3')], activeId: 'a' });
    useTabStore.getState().removePages(['page:rule:r3']);
    expect(useTabStore.getState()).toMatchObject({ activeId: 'a', pages: [WHATS_NEW] });
    const state = useTabStore.getState();
    useTabStore.getState().removePages(['nope']);
    expect(useTabStore.getState()).toBe(state);
  });

  it('tells which pages would lose edits, and which belong to the workspace', () => {
    expect(isPageDirty(WHATS_NEW)).toBe(false);
    expect(isPageDirty(rulePage('r1'))).toBe(false);
    expect(isPageDirty(rulePage('r1', DRAFT))).toBe(true);
    expect(isPageDirty(newRulePage('n1'))).toBe(false);
    expect(isPageDirty(newRulePage('n1', DRAFT))).toBe(true);
    expect(PAGE_SCOPES).toEqual({ 'whats-new': 'app', rule: 'workspace', 'new-rule': 'workspace' });
  });

  it("closes the workspace's rule and new-rule pages with its tabs; What's New stays", () => {
    useTabStore.setState({ tabs: [file('a')], pages: [rulePage('r1', DRAFT), WHATS_NEW, newRulePage('n1')], activeId: 'page:rule:r1' });
    closeSessionTabs();
    expect(useTabStore.getState()).toMatchObject({ tabs: [], pages: [WHATS_NEW], activeId: WHATS_NEW.id });
  });

  it('asks before closing a rule page with unapplied edits, and not one without', async () => {
    useTabStore.setState({ pages: [rulePage('r1', DRAFT), newRulePage('n1')], activeId: 'page:rule:r1' });
    confirm.mockResolvedValueOnce(false);
    await closeTab('page:rule:r1');
    expect(confirm).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Discard your changes to r1?', tone: 'danger' }));
    expect(pageIds()).toEqual(['page:rule:r1', 'page:new-rule:n1']);

    await closeTab('page:rule:r1');
    expect(pageIds()).toEqual(['page:new-rule:n1']);

    await closeTab('page:new-rule:n1');
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(pageIds()).toEqual([]);
  });
});
