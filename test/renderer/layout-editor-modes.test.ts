import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResourceKind } from '../../src/shared/types';
import { useOverlayStore } from '@/shared/lib';
import { focusWhenFree, requestEditorFocus, takeFocusRequest, trackTreeNavigation } from '@/shared/monaco/editors';
import { isLiteModel, LARGE_FILE_CHARS, languageFor } from '@/shared/monaco/languages';
import { openedTabId } from '@/widgets/editor-panel/lib/openedTabId';

const KINDS: ResourceKind[] = ['Script', 'Stylesheet', 'Document'];

describe('large-file (lite) languages', () => {
  it('gives every kind a highlight-only language at the threshold, and its full one below', () => {
    for (const kind of KINDS) {
      const full = languageFor(kind, LARGE_FILE_CHARS - 1);
      const lite = languageFor(kind, LARGE_FILE_CHARS);
      expect(lite).not.toBe(full);
      expect(full).toBe(languageFor(kind, 0));
      // How a tab's `lite` flag (banner, status bar) is derived when its model is created.
      expect(lite !== languageFor(kind, 0)).toBe(true);
    }
    expect(languageFor('Stylesheet', LARGE_FILE_CHARS)).toBe('css-lite');
    expect(languageFor('Document', LARGE_FILE_CHARS)).toBe('html-lite');
    expect(languageFor('Script', LARGE_FILE_CHARS)).toBe('javascript-lite');
  });

  it('applies lite editor options to lite-language models and to models that grew past the threshold', () => {
    const model = (language: string, length: number) => ({ getLanguageId: () => language, getValueLength: () => length });
    expect(isLiteModel(model('css-lite', 10))).toBe(true);
    expect(isLiteModel(model('javascript', LARGE_FILE_CHARS))).toBe(true);
    expect(isLiteModel(model('html', LARGE_FILE_CHARS - 1))).toBe(false);
  });
});

describe('which tab changes ask the editor for focus', () => {
  const state = (ids: string[], activeId: string | null) => ({ tabs: ids.map((id) => ({ id })), activeId });

  it('opening or switching to a tab does', () => {
    expect(openedTabId(state(['a'], 'a'), state([], null))).toBe('a');
    expect(openedTabId(state(['a', 'b'], 'b'), state(['a'], 'a'))).toBe('b');
    expect(openedTabId(state(['a', 'b'], 'a'), state(['a', 'b'], 'b'))).toBe('a');
  });

  it('closing the active tab (its neighbour takes over), or any other change, does not', () => {
    expect(openedTabId(state(['a', 'c'], 'c'), state(['a', 'b', 'c'], 'b'))).toBeNull();
    expect(openedTabId(state([], null), state(['a'], 'a'))).toBeNull();
    expect(openedTabId(state(['a'], 'a'), state(['a', 'b'], 'a'))).toBeNull();
    // Closing a page tab (What's New) hands over to a file the same way.
    const page = [{ id: 'page:whats-new' }];
    expect(openedTabId({ ...state(['a'], 'a'), pages: [] }, { ...state(['a'], 'page:whats-new'), pages: page })).toBeNull();
  });

  it('switching from a page tab to a file does', () => {
    const page = [{ id: 'page:whats-new' }];
    expect(openedTabId({ ...state(['a'], 'a'), pages: page }, { ...state(['a'], 'page:whats-new'), pages: page })).toBe('a');
  });
});

describe('editor focus requests', () => {
  const modelA = {} as never;
  const modelB = {} as never;

  it('are honoured only for the model they name, and cleared by any swap', () => {
    requestEditorFocus(modelA);
    expect(takeFocusRequest(modelB)).toBe(false);
    expect(takeFocusRequest(modelA)).toBe(false);
    requestEditorFocus(modelA);
    expect(takeFocusRequest(modelA)).toBe(true);
    expect(takeFocusRequest(modelA)).toBe(false);
  });
});

describe('focusWhenFree', () => {
  /** A stand-in element; `within` lists the selectors of the ancestors it sits in. */
  const element = (opts: { editable?: boolean; within?: string[] } = {}) => ({
    matches: () => !!opts.editable,
    closest: (selector: string) => (opts.within?.some((s) => selector.includes(s)) ? {} : null),
  });
  const body = element();
  const setFocus = (el: object) => vi.stubGlobal('document', { body, activeElement: el });
  const editor = () => ({ focus: vi.fn() });

  afterEach(() => {
    vi.unstubAllGlobals();
    useOverlayStore.setState({ open: 0 });
  });

  it('focuses when nothing else holds focus, or focus is in an editor', () => {
    for (const el of [body, element({ within: ['monaco-editor'] })]) {
      setFocus(el);
      const e = editor();
      focusWhenFree(e as never);
      expect(e.focus).toHaveBeenCalledTimes(1);
    }
  });

  it('leaves focus in a text field or on the tab strip (a keyboard close lands there)', () => {
    for (const el of [element({ editable: true }), element({ within: ['tablist'] })]) {
      setFocus(el);
      const e = editor();
      focusWhenFree(e as never);
      expect(e.focus).not.toHaveBeenCalled();
    }
  });

  it('waits for open overlays to close, then checks focus again', () => {
    setFocus(element({ editable: true })); // typing in the palette
    useOverlayStore.setState({ open: 1 });
    const e = editor();
    focusWhenFree(e as never);
    expect(e.focus).not.toHaveBeenCalled();
    setFocus(body); // the palette closed and gave focus back to nothing in particular
    useOverlayStore.getState().change(-1);
    expect(e.focus).toHaveBeenCalledTimes(1);

    setFocus(element({ editable: true }));
    useOverlayStore.setState({ open: 1 });
    const later = editor();
    focusWhenFree(later as never);
    useOverlayStore.getState().change(-1); // focus went back to, say, the address bar
    expect(later.focus).not.toHaveBeenCalled();
  });

  it('leaves focus in a tree browsed by keyboard, but follows the click or Enter/Space that opened a file', () => {
    const listeners: Record<string, (event: object) => void> = {};
    class Target {
      constructor(readonly inTree: boolean) {}
      closest(selector: string) {
        return this.inTree && selector.includes('tree') ? this : null;
      }
    }
    vi.stubGlobal('Element', Target);
    vi.stubGlobal('window', { addEventListener: (type: string, fn: (event: object) => void) => (listeners[type] = fn), removeEventListener: vi.fn() });
    const untrack = trackTreeNavigation();
    const key = (k: string, inTree = true) => listeners.keydown({ key: k, target: new Target(inTree) });
    const focused = () => {
      const e = editor();
      focusWhenFree(e as never);
      return e.focus.mock.calls.length > 0;
    };
    setFocus(element({ within: ['tree'] }));

    expect(focused()).toBe(true); // clicked a row (nothing typed yet)
    key('ArrowDown'); // a slow open finishes while arrowing on
    expect(focused()).toBe(false);
    key('f'); // type-ahead
    expect(focused()).toBe(false);
    key('Enter');
    expect(focused()).toBe(true);
    key('ArrowUp');
    listeners.pointerdown({});
    expect(focused()).toBe(true);
    key('ArrowUp');
    key('Enter', false); // picked in the palette, which handed focus back to the tree
    expect(focused()).toBe(true);
    key('ArrowUp');
    untrack();
    expect(focused()).toBe(true);
  });

  it('can be cancelled while waiting (the editor moved on to another model)', () => {
    setFocus(body);
    useOverlayStore.setState({ open: 1 });
    const e = editor();
    const cancel = focusWhenFree(e as never);
    cancel();
    useOverlayStore.getState().change(-1);
    expect(e.focus).not.toHaveBeenCalled();
  });
});
