import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type CreateRuleInput, type HeaderEdit, type ResourceEntry, type Rule, type RulePatch } from '../../src/shared/types';
import { saveActive } from '@/app/model/bridge/commands/saveActive';
import type { MenuAction } from '@/shared/ui/menu';
import { type RulePageDraft, useTabStore } from '@/entities/editor-tab';
import {
  blockingRuleFor,
  HEADER_PRESETS,
  MAX_RECENT_REQUESTS,
  NO_STORE_PRESET,
  recordHits,
  REMOVE_CSP_PRESET,
  ruleLabel,
  selectRuleList,
  toRuleInput,
  useRuleStore,
} from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { deleteRule } from '@/features/rule/delete';
import { applyRulePage, createRulePage, openNewRule, openRuleEditor, RULE_SEEDS, rulePageId, setRuleDraft } from '@/features/rule/edit';
import { patchFor } from '@/features/rule/edit/model/patchFor';
import { ruleNotes } from '@/features/rule/edit/ui/RuleForm/ruleNotes';
import { withPreset } from '@/features/rule/edit/ui/RuleForm/withPreset';
import { blockRequest, createQuickRule, removeCspFrom } from '@/features/rule/quick-actions';
import { saveTab } from '@/features/save-override';
import { setRuleEnabled } from '@/features/rule/toggle';
import { isPageDocument } from '@/widgets/editor-panel/lib/isPageDocument';
import { ruleMenuItems } from '@/widgets/explorer/ui/ResourceTree/ruleMenuItems';

const api = vi.hoisted(() => ({
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(async (_id: string) => {}),
  reload: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn((_options: object) => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn(async (_options: { title: string }) => true));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String((err as Error)?.message ?? err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({ dispose: () => {} }) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));
vi.mock('@/features/save-override', () => ({ saveTab: vi.fn(async () => {}), savesSettled: vi.fn(async () => {}) }));

type ToastCall = { title: string; description?: string; tone?: string; action?: { label: string; onClick(): void } };
const toasts = () => (toast.mock.calls as unknown as Array<[ToastCall]>).map(([t]) => t);

let seq = 0;
function rule(overrides: Partial<Rule> & Pick<Rule, 'action'> = { action: 'block' }): Rule {
  const id = overrides.id ?? `r${++seq}`;
  const base = { id, match: { type: 'exact' as const, pattern: `https://site.test/${id}.js`, ignoreQuery: true }, resourceTypes: [], enabled: true, createdAt: seq, updatedAt: seq };
  return { ...base, ...(overrides.action === 'headers' ? { headers: [{ operation: 'set', name: 'X-A', value: '1' }] } : {}), ...overrides } as Rule;
}
const blockInput = (pattern = 'https://ads.test/*'): CreateRuleInput => ({ action: 'block', match: { type: 'glob', pattern, ignoreQuery: true }, resourceTypes: [] });
const draftOf = (base: CreateRuleInput, value: CreateRuleInput, rowKeys: string[] = []): RulePageDraft => ({ base, value, rowKeys });
const entry = (url: string, extra: Partial<ResourceEntry> = {}): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200, ...extra });
const setReload = (on: boolean) => useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, autoReloadOnSave: on } });

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  useRuleStore.setState({ byId: {}, hits: {}, recent: {} });
  useWorkspaceStore.setState({ workspaces: [], activeId: 'w1', favicons: {}, switchingTo: null });
  setReload(true);
});

describe('quick rules', () => {
  it('blocks a file by its exact URL (any query), with an Undo that deletes the rule, then reloads', async () => {
    const created = rule({ id: 'b1', action: 'block' });
    api.createRule.mockResolvedValueOnce(created);
    await blockRequest('https://site.test/js/analytics.js?v=3');

    expect(api.createRule).toHaveBeenCalledExactlyOnceWith({
      action: 'block',
      match: { type: 'exact', pattern: 'https://site.test/js/analytics.js', ignoreQuery: true },
      resourceTypes: [],
    });
    expect(useRuleStore.getState().byId.b1).toEqual(created);
    expect(api.reload).toHaveBeenCalledTimes(1);
    const [shown] = toasts();
    expect(shown).toMatchObject({ title: 'Blocked analytics.js', action: { label: 'Undo' } });
    expect(shown!.description).toBeUndefined();

    shown!.action!.onClick();
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(2));
    expect(api.deleteRule).toHaveBeenCalledExactlyOnceWith('b1');
    expect(api.deleteRule.mock.invocationCallOrder[0]).toBeLessThan(api.reload.mock.invocationCallOrder[1]!);
  });

  it('refuses while a workspace switch runs', async () => {
    useWorkspaceStore.setState({ switchingTo: 'w2' });
    await blockRequest('https://site.test/a.js');
    await removeCspFrom('https://site.test/');
    expect(api.createRule).not.toHaveBeenCalled();
  });

  it("drops a document's CSP headers only", async () => {
    api.createRule.mockResolvedValueOnce(rule({ action: 'headers' }));
    await removeCspFrom('https://site.test/app/?q=1');
    expect(api.createRule).toHaveBeenCalledExactlyOnceWith({
      action: 'headers',
      match: { type: 'exact', pattern: 'https://site.test/app/', ignoreQuery: true },
      resourceTypes: ['Document'],
      headers: REMOVE_CSP_PRESET.edits,
    });
    expect(toasts()[0]).toMatchObject({ title: 'Content-Security-Policy removed' });
  });

  it('says to reload when the page is not reloaded after changes, and reports a refusal', async () => {
    setReload(false);
    api.createRule.mockResolvedValueOnce(rule());
    await createQuickRule(blockInput(), 'Blocked');
    expect(api.reload).not.toHaveBeenCalled();
    expect(toasts()[0]).toMatchObject({ description: 'Reload the page to apply it' });

    api.createRule.mockRejectedValueOnce(new Error('A workspace holds at most 200 rules'));
    await createQuickRule(blockInput(), 'Blocked');
    expect(toasts()[1]).toMatchObject({ tone: 'danger', description: 'A workspace holds at most 200 rules' });
  });
});

describe('toggling and deleting rules', () => {
  it('turns a rule off at once, then reloads; a refusal puts it back with a toast', async () => {
    const r = rule();
    useRuleStore.getState().setAll([r]);
    let resolve!: (value: Rule) => void;
    api.updateRule.mockReturnValueOnce(new Promise<Rule>((res) => (resolve = res)));

    const done = setRuleEnabled(r.id, false);
    expect(useRuleStore.getState().byId[r.id]!.enabled).toBe(false);
    expect(api.updateRule).toHaveBeenCalledExactlyOnceWith(r.id, { enabled: false });
    resolve({ ...r, enabled: false });
    await done;
    expect(api.reload).toHaveBeenCalledTimes(1);

    api.updateRule.mockRejectedValueOnce(new Error('Unknown rule'));
    await setRuleEnabled(r.id, true);
    expect(useRuleStore.getState().byId[r.id]!.enabled).toBe(false);
    expect(toasts().at(-1)).toMatchObject({ tone: 'danger', description: 'Unknown rule' });
    expect(api.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads after a toggle only with the setting on, and refuses while a switch runs', async () => {
    const r = rule();
    useRuleStore.getState().setAll([r]);
    setReload(false);
    api.updateRule.mockResolvedValueOnce({ ...r, enabled: false });
    await setRuleEnabled(r.id, false);
    expect(api.reload).not.toHaveBeenCalled();

    useWorkspaceStore.setState({ switchingTo: 'w2' });
    await setRuleEnabled(r.id, true);
    expect(api.updateRule).toHaveBeenCalledTimes(1);
  });

  it('deletes a rule only once confirmed', async () => {
    const r = rule();
    useRuleStore.getState().setAll([r]);
    confirm.mockResolvedValueOnce(false);
    await deleteRule(r.id);
    expect(confirm).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Delete this rule?', body: ruleLabel(r), tone: 'danger' }));
    expect(api.deleteRule).not.toHaveBeenCalled();

    await deleteRule(r.id);
    expect(api.deleteRule).toHaveBeenCalledExactlyOnceWith(r.id);
    expect(toasts()[0]).toMatchObject({ title: 'Rule deleted' });
    expect(api.reload).toHaveBeenCalledTimes(1);
  });
});

describe('rule pages', () => {
  it('keeps edits as a draft, and none once they lead back to where they started', () => {
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1' });
    const base = blockInput();
    const edited = draftOf(base, { ...base, resourceTypes: ['Script'] });
    setRuleDraft('page:rule:r1', edited);
    expect(useTabStore.getState().pages[0]).toMatchObject({ draft: edited });
    setRuleDraft('page:rule:r1', draftOf(base, { ...base, match: { ...base.match } }));
    expect(useTabStore.getState().pages[0]).not.toHaveProperty('draft', expect.anything());
  });

  it('sends only the fields that changed', () => {
    const saved: CreateRuleInput = { action: 'headers', match: { type: 'exact', pattern: 'https://a.test/', ignoreQuery: true }, resourceTypes: ['Document'], headers: [{ operation: 'remove', name: 'X-Frame-Options', value: '' }] };
    expect(patchFor(saved, { ...saved, match: { ...saved.match } })).toEqual({});
    expect(patchFor(saved, { ...saved, match: { ...saved.match, type: 'glob' } })).toEqual({ match: { ...saved.match, type: 'glob' } });
    expect(patchFor(saved, { ...saved, resourceTypes: [] })).toEqual({ resourceTypes: [] });
    const headers: HeaderEdit[] = [{ operation: 'set', name: 'X-Frame-Options', value: 'SAMEORIGIN' }];
    expect(patchFor(saved, { ...saved, headers })).toEqual({ headers });
  });

  it('seeds new rules from a URL or from scratch', () => {
    expect(RULE_SEEDS.block('https://site.test/a.js?x=1')).toEqual({ action: 'block', match: { type: 'exact', pattern: 'https://site.test/a.js', ignoreQuery: true }, resourceTypes: [] });
    expect(RULE_SEEDS.cors()).toEqual({ action: 'cors', match: { type: 'glob', pattern: '', ignoreQuery: true }, resourceTypes: [] });
    expect(RULE_SEEDS.headers()).toEqual({ action: 'headers', match: { type: 'glob', pattern: '', ignoreQuery: true }, resourceTypes: [], headers: [{ operation: 'set', name: '', value: '' }] });
    // Each seed is its own object: editing one never changes the next.
    expect(RULE_SEEDS.block().match).not.toBe(RULE_SEEDS.block().match);
  });

  it('opens one page per rule, and new-rule pages titled by what they do', () => {
    const r = rule({ id: 'r9', action: 'block', match: { type: 'glob', pattern: 'https://ads.test/*', ignoreQuery: true } });
    openRuleEditor(r);
    openRuleEditor(r);
    openNewRule(RULE_SEEDS.cors());
    const { pages } = useTabStore.getState();
    expect(pages.map((p) => p.title)).toEqual(['https://ads.test/*', 'New allow cross-origin requests']);
    expect(pages[0]).toMatchObject({ id: rulePageId('r9'), page: 'rule', ruleId: 'r9' });
    expect(pages[1]!.id).toMatch(/^page:new-rule:/);

    useWorkspaceStore.setState({ switchingTo: 'w2' });
    openNewRule(RULE_SEEDS.block());
    expect(useTabStore.getState().pages).toHaveLength(2);
  });

  it('applies valid edits: only what changed is sent, the draft goes and the tab is retitled', async () => {
    const r = rule({ id: 'r1', action: 'block', resourceTypes: ['Script'] });
    useRuleStore.getState().setAll([r]);
    const saved = toRuleInput(r);
    const value: CreateRuleInput = { ...saved, match: { type: 'glob', pattern: '  https://ads.test/*  ', ignoreQuery: true } };
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1.js · site.test', draft: draftOf(saved, value) });
    const updated = { ...r, match: { type: 'glob' as const, pattern: 'https://ads.test/*', ignoreQuery: true } };
    api.updateRule.mockResolvedValueOnce(updated);

    await applyRulePage('page:rule:r1');

    expect(api.updateRule).toHaveBeenCalledExactlyOnceWith('r1', { match: updated.match } satisfies RulePatch);
    expect(useRuleStore.getState().byId.r1).toEqual(updated);
    expect(useTabStore.getState().pages).toEqual([{ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'https://ads.test/*' }]);
    expect(toasts()[0]).toMatchObject({ title: 'Rule updated' });
    expect(api.reload).toHaveBeenCalledTimes(1);
  });

  it('keeps what is typed while an Apply runs, as edits to the version it saved', async () => {
    const r = rule({ id: 'r1', action: 'block' });
    useRuleStore.getState().setAll([r]);
    const saved = toRuleInput(r);
    const sent: CreateRuleInput = { ...saved, resourceTypes: ['Script'] };
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1', draft: draftOf(saved, sent) });
    let resolve!: (value: Rule) => void;
    api.updateRule.mockReturnValueOnce(new Promise<Rule>((res) => (resolve = res)));

    const done = applyRulePage('page:rule:r1');
    const typed: CreateRuleInput = { ...sent, match: { ...sent.match, pattern: 'https://site.test/r1.mjs' } };
    setRuleDraft('page:rule:r1', draftOf(saved, typed));
    const updated = { ...r, resourceTypes: ['Script' as const] };
    resolve(updated);
    await done;

    expect(useTabStore.getState().pages[0]).toMatchObject({ draft: draftOf(toRuleInput(updated), typed) });
  });

  it('does not send invalid edits, nor edits made to an older version of the rule', async () => {
    const r = rule({ id: 'r1', action: 'headers' });
    useRuleStore.getState().setAll([r]);
    const saved = toRuleInput(r);
    const invalid = { ...saved, headers: [{ operation: 'set' as const, name: 'Set-Cookie', value: 'a=1' }] };
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1', draft: draftOf(saved, invalid) });

    await applyRulePage('page:rule:r1');
    expect(api.updateRule).not.toHaveBeenCalled();
    expect(toasts()[0]).toMatchObject({ title: 'Rule not applied', tone: 'danger', description: expect.stringContaining('Set-Cookie') });

    const stale = { ...saved, resourceTypes: ['XHR' as const] };
    useTabStore.getState().setPageDraft('page:rule:r1', draftOf(stale, { ...stale, resourceTypes: [] }));
    await applyRulePage('page:rule:r1');
    expect(api.updateRule).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('creates the rule a new-rule page describes, and swaps the page for the rule’s own', async () => {
    const seed = RULE_SEEDS.block();
    const value = blockInput('https://www.google-analytics.com/*');
    useTabStore.getState().openPage({ id: 'page:new-rule:n1', page: 'new-rule', seed, title: 'New block requests', draft: draftOf(seed, value) });
    const created = rule({ id: 'c1', action: 'block', match: value.match });
    api.createRule.mockResolvedValueOnce(created);

    await createRulePage('page:new-rule:n1');

    expect(api.createRule).toHaveBeenCalledExactlyOnceWith(value);
    expect(useTabStore.getState().pages).toEqual([{ id: 'page:rule:c1', page: 'rule', ruleId: 'c1', title: 'https://www.google-analytics.com/*' }]);
    expect(useTabStore.getState().activeId).toBe('page:rule:c1');
    expect(useRuleStore.getState().byId.c1).toEqual(created);
    expect(toasts()[0]).toMatchObject({ title: 'Rule added' });
  });

  it('does not create an invalid rule', async () => {
    useTabStore.getState().openPage({ id: 'page:new-rule:n1', page: 'new-rule', seed: RULE_SEEDS.headers(), title: 'New' });
    await createRulePage('page:new-rule:n1');
    expect(api.createRule).not.toHaveBeenCalled();
    expect(toasts()[0]).toMatchObject({ title: 'Rule not added', tone: 'danger' });
    expect(useTabStore.getState().pages).toHaveLength(1);
  });
});

describe('results that arrive after a workspace switch', () => {
  /** Resolves `mock`'s next call only once the workspace has switched to w2. */
  function afterSwitch<T>(mock: { mockReturnValueOnce(value: Promise<T>): unknown }, value: T) {
    mock.mockReturnValueOnce(Promise.resolve().then(() => {
      useWorkspaceStore.setState({ activeId: 'w2' });
      return value;
    }));
  }

  it('are not written into the rules, tabs or page now shown', async () => {
    const r = rule({ id: 'r1', action: 'block' });
    useRuleStore.getState().setAll([r]);

    afterSwitch(api.updateRule, { ...r, enabled: false });
    await setRuleEnabled('r1', false);
    // The optimistic change went with the workspace's list; the switch loads the next one.
    useRuleStore.getState().setAll([]);
    expect(useRuleStore.getState().byId).toEqual({});

    useWorkspaceStore.setState({ activeId: 'w1' });
    afterSwitch(api.createRule, rule({ id: 'q1', action: 'block' }));
    await createQuickRule(blockInput(), 'Blocked');
    expect(useRuleStore.getState().byId).toEqual({});
    expect(toasts().at(-1)).toMatchObject({ title: 'Blocked', description: undefined });

    useWorkspaceStore.setState({ activeId: 'w1' });
    useTabStore.getState().openPage({ id: 'page:new-rule:n1', page: 'new-rule', seed: blockInput(), title: 'New' });
    afterSwitch(api.createRule, rule({ id: 'c1', action: 'block' }));
    await createRulePage('page:new-rule:n1');
    expect(useRuleStore.getState().byId).toEqual({});
    expect(useTabStore.getState().pages.map((p) => p.id)).toEqual(['page:new-rule:n1']);

    useWorkspaceStore.setState({ activeId: 'w1' });
    useRuleStore.getState().setAll([r]);
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1', draft: draftOf(toRuleInput(r), { ...toRuleInput(r), resourceTypes: ['Script'] }) });
    afterSwitch(api.updateRule, { ...r, resourceTypes: ['Script'] });
    await applyRulePage('page:rule:r1');
    expect(useRuleStore.getState().byId.r1).toEqual(r);
    expect(toasts().at(-1)).toMatchObject({ title: 'Rule updated' });

    expect(api.reload).not.toHaveBeenCalled();
  });
});

describe('saving what is in front', () => {
  it('saves a file tab, applies a rule page, creates a new rule, and does nothing on What’s New', async () => {
    useTabStore.setState({ tabs: [{ id: 'tab-1', url: 'https://site.test/a.js', kind: 'Script', originalHash: null, lite: false, dirty: true, saving: false }], activeId: 'tab-1' });
    saveActive();
    expect(saveTab).toHaveBeenCalledExactlyOnceWith();

    const r = rule({ id: 'r1', action: 'block' });
    useRuleStore.getState().setAll([r]);
    const saved = toRuleInput(r);
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1', draft: draftOf(saved, { ...saved, resourceTypes: ['Script'] }) });
    api.updateRule.mockResolvedValueOnce({ ...r, resourceTypes: ['Script'] });
    saveActive();
    await vi.waitFor(() => expect(api.updateRule).toHaveBeenCalledExactlyOnceWith('r1', { resourceTypes: ['Script'] }));

    const seed = RULE_SEEDS.cors();
    useTabStore.getState().openPage({ id: 'page:new-rule:n1', page: 'new-rule', seed, title: 'New', draft: draftOf(seed, { ...seed, match: { ...seed.match, pattern: 'https://api.test/*' } }) });
    api.createRule.mockResolvedValueOnce(rule({ id: 'c1', action: 'cors' }));
    saveActive();
    await vi.waitFor(() => expect(api.createRule).toHaveBeenCalledTimes(1));

    useTabStore.getState().openPage({ id: 'page:whats-new', page: 'whats-new', title: "What's New" });
    saveActive();
    expect(saveTab).toHaveBeenCalledTimes(1);
    expect(api.updateRule).toHaveBeenCalledTimes(1);
    expect(api.createRule).toHaveBeenCalledTimes(1);
  });
});

describe('rule notes', () => {
  const notes = (value: CreateRuleInput, pageUrl = 'https://site.test/') => ruleNotes(value, pageUrl).map((n) => n.id);
  const headers = (...names: string[]): CreateRuleInput => ({
    action: 'headers',
    match: { type: 'exact', pattern: 'https://site.test/', ignoreQuery: true },
    resourceTypes: [],
    headers: names.map((name) => ({ operation: 'remove', name, value: '' })),
  });

  it('says what a rule as written costs or cannot change', () => {
    expect(notes(blockInput('https://ads.test/*'))).toEqual([]);
    expect(notes({ ...blockInput('ads'), match: { type: 'regex', pattern: 'ads', ignoreQuery: false } })).toEqual(['regex']);
    // A block rule matching the page itself: only block rules.
    expect(notes(blockInput('https://site.test/*'))).toEqual(['matches-page']);
    expect(notes({ ...blockInput('https://site.test/*'), action: 'cors' })).toEqual([]);
    expect(notes(blockInput('https://site.test/*'), '')).toEqual([]);
    expect(notes(headers('cache-control'))).toEqual(['cache-headers']);
    expect(notes(headers('Content-Security-Policy', 'X-Frame-Options'))).toEqual(['document-security']);
    expect(notes(headers('Access-Control-Allow-Origin', 'Expires'))).toEqual(['cache-headers', 'allow-origin']);
  });
});

describe('rule entity', () => {
  it('counts hits, keeps one recent request per URL (newest first) and at most MAX_RECENT_REQUESTS', () => {
    const batch = [
      { ruleId: 'r1', url: 'https://a.test/1' },
      { ruleId: 'r1', url: 'https://a.test/2' },
      { ruleId: 'r1', url: 'https://a.test/1' },
      { ruleId: 'r2', url: 'https://a.test/1' },
    ];
    const hits0 = { r0: 5 };
    const { hits, recent } = recordHits(hits0, {}, batch, 1000);
    expect(hits).toEqual({ r0: 5, r1: 3, r2: 1 });
    expect(hits0).toEqual({ r0: 5 });
    expect(recent.r1).toEqual([
      { url: 'https://a.test/1', count: 2, lastAt: 1000 },
      { url: 'https://a.test/2', count: 1, lastAt: 1000 },
    ]);

    const many = Array.from({ length: MAX_RECENT_REQUESTS + 5 }, (_, i) => ({ ruleId: 'r1', url: `https://a.test/n${i}` }));
    const capped = recordHits(hits, recent, many, 2000).recent.r1!;
    expect(MAX_RECENT_REQUESTS).toBe(20);
    expect(capped).toHaveLength(MAX_RECENT_REQUESTS);
    expect(capped[0]!.url).toBe(`https://a.test/n${MAX_RECENT_REQUESTS + 4}`);
  });

  it('keeps hits and recent requests when the rule list is replaced', () => {
    useRuleStore.getState().recordHits([{ ruleId: 'r1', url: 'https://a.test/' }]);
    useRuleStore.getState().setAll([rule({ id: 'r1', action: 'block' })]);
    expect(useRuleStore.getState().hits).toEqual({ r1: 1 });
    expect(useRuleStore.getState().recent.r1).toHaveLength(1);
  });

  it('lists rules oldest first', () => {
    const [a, b, c] = [rule({ id: 'c', action: 'block', createdAt: 1 }), rule({ id: 'a', action: 'block', createdAt: 2 }), rule({ id: 'b', action: 'block', createdAt: 1 })];
    useRuleStore.getState().setAll([b, a, c]);
    expect(selectRuleList(useRuleStore.getState()).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('finds the oldest enabled block rule that blocks a file of that kind', () => {
    const glob = { type: 'glob' as const, pattern: 'https://site.test/*', ignoreQuery: true };
    const off = rule({ id: 'off', action: 'block', match: glob, enabled: false, createdAt: 0 });
    const css = rule({ id: 'css', action: 'block', match: glob, resourceTypes: ['Stylesheet'], createdAt: 1 });
    const headers = rule({ id: 'hdr', action: 'headers', match: glob, createdAt: 2 });
    const newer = rule({ id: 'new', action: 'block', match: glob, createdAt: 9 });
    const older = rule({ id: 'old', action: 'block', match: glob, resourceTypes: ['Script', 'Document'], createdAt: 5 });
    const byId = Object.fromEntries([off, css, headers, newer, older].map((r) => [r.id, r]));
    expect(blockingRuleFor(byId, 'https://site.test/a.js', 'Script')?.id).toBe('old');
    expect(blockingRuleFor(byId, 'https://site.test/a.css', 'Stylesheet')?.id).toBe('css');
    expect(blockingRuleFor(byId, 'https://other.test/a.js', 'Script')).toBeUndefined();
    expect(blockingRuleFor({ off }, 'https://site.test/a.js', 'Script')).toBeUndefined();
  });

  it('names rules by file and host for exact URLs, else by pattern', () => {
    const exact = (pattern: string) => ruleLabel({ match: { type: 'exact', pattern, ignoreQuery: true } });
    expect(exact('https://cdn.site.test/js/analytics.js')).toBe('analytics.js · cdn.site.test');
    expect(exact('https://site.test/')).toBe('site.test');
    expect(exact('not a url')).toBe('not a url');
    expect(ruleLabel({ match: { type: 'glob', pattern: 'https://ads.test/*', ignoreQuery: true } })).toBe('https://ads.test/*');
  });

  it('turns a rule back into what it was created from', () => {
    const r = rule({ id: 'h1', action: 'headers' });
    expect(toRuleInput(r)).toEqual({ action: 'headers', match: r.match, resourceTypes: [], headers: [{ operation: 'set', name: 'X-A', value: '1' }] });
  });
});

describe('header presets', () => {
  it('adds a preset’s changes, in place of blank rows, with new row keys', () => {
    const blank: HeaderEdit = { operation: 'set', name: '', value: '' };
    const kept: HeaderEdit = { operation: 'set', name: 'X-A', value: '1' };
    const next = withPreset([blank, kept], ['saved-0', 'saved-1'], NO_STORE_PRESET);
    expect(next.headers).toEqual([kept, { operation: 'set', name: 'Cache-Control', value: 'no-store' }]);
    expect(next.rowKeys[0]).toBe('saved-1');
    expect(next.rowKeys[1]).toMatch(/^row-/);
    expect(HEADER_PRESETS.map((p) => p.label)).toContain(REMOVE_CSP_PRESET.label);
    expect(REMOVE_CSP_PRESET.edits.map((e) => e.name)).toEqual(['Content-Security-Policy', 'Content-Security-Policy-Report-Only']);
  });
});

describe('blocked-file banner', () => {
  it("never counts the page's own document as blocked, whatever its #fragment", () => {
    const doc = (url: string) => ({ url, kind: 'Document' as const });
    expect(isPageDocument(doc('https://site.test/app'), 'https://site.test/app#/settings')).toBe(true);
    expect(isPageDocument(doc('https://site.test/app?x=1'), 'https://site.test/app')).toBe(false);
    expect(isPageDocument({ url: 'https://site.test/app', kind: 'Script' }, 'https://site.test/app')).toBe(false);
    expect(isPageDocument(doc('https://site.test/'), '')).toBe(false);
  });
});

describe('file row rule actions', () => {
  const labels = (e: ResourceEntry) => ruleMenuItems(e).map((item) => (item.separator ? '—' : item.label));

  it('offers to unblock and edit a blocked file', () => {
    expect(labels(entry('https://site.test/a.js', { blockedBy: 'r1', status: 0, mimeType: '' }))).toEqual([
      'Unblock (turn its rule off)',
      'Edit blocking rule…',
      'Change response headers…',
    ]);
  });

  it("blocks files and iframes, never the page's own document; documents can drop their CSP", () => {
    expect(labels(entry('https://site.test/a.js'))).toEqual(['Block this request', 'Change response headers…']);
    expect(labels(entry('https://site.test/', { kind: 'Document' }))).toEqual(['Remove Content-Security-Policy', 'Change response headers…']);
    expect(labels(entry('https://widget.test/', { kind: 'Document', frame: { url: 'https://widget.test/', depth: 1 } }))).toEqual([
      'Block this iframe',
      'Remove Content-Security-Policy',
      'Change response headers…',
    ]);
  });

  it('runs the quick rules and opens a headers rule for the file', async () => {
    api.createRule.mockResolvedValue(rule());
    const items = ruleMenuItems(entry('https://site.test/a.js?x=1'));
    const select = (label: string) => items.find((i): i is MenuAction => !i.separator && i.label === label)!.onSelect();
    select('Block this request');
    await vi.waitFor(() => expect(api.createRule).toHaveBeenCalledWith(expect.objectContaining({ action: 'block' })));

    select('Change response headers…');
    expect(useTabStore.getState().pages).toEqual([expect.objectContaining({ page: 'new-rule', seed: RULE_SEEDS.headers('https://site.test/a.js') })]);
  });
});
