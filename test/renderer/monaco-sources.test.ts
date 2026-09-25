import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestReveal, takeRevealRequest } from '@/shared/monaco/editors';
import { editorState } from '@/shared/monaco/editors/editorState';
import { LARGE_FILE_CHARS, languageForPath } from '@/shared/monaco/languages';
import { READ_ONLY_URI_AUTHORITY, readOnlyOptionsFor } from '@/shared/monaco/models';
import type { monaco } from '@/shared/monaco/setup';

describe('languages of original sources', () => {
  it("picks an original's language from its extension", () => {
    const language = (name: string) => {
      const { id, name: shown } = languageForPath(name, 10);
      return `${id} ${shown}`;
    };
    expect(language('lib.ts')).toBe('typescript TypeScript');
    expect(language('App.tsx')).toBe('typescript TypeScript JSX');
    expect(language('worker.MTS')).toBe('typescript TypeScript');
    expect(language('index.jsx')).toBe('javascript JavaScript JSX');
    expect(language('theme.scss')).toBe('scss SCSS');
    expect(language('App.vue')).toBe('html Vue');
    expect(language('Page.svelte')).toBe('html Svelte');
    expect(language('page.astro')).toBe('html Astro');
    expect(language('bootstrap')).toBe('plaintext Plain text');
    expect(language('data.bin')).toBe('plaintext Plain text');
  });

  it('lets a lang query hint win, and ignores other queries', () => {
    expect(languageForPath('App.vue?vue&type=script&lang.ts', 10)).toMatchObject({ id: 'typescript' });
    expect(languageForPath('App.vue?vue&type=style&index=0&lang=scss', 10)).toMatchObject({ id: 'scss' });
    expect(languageForPath('App.vue?vue&type=template', 10)).toMatchObject({ id: 'html', name: 'Vue' });
    expect(languageForPath('lib.ts?v=3', 10)).toMatchObject({ id: 'typescript' });
  });

  it('switches to a highlight-only twin, or plain text, at the large-file size', () => {
    expect(languageForPath('lib.ts', LARGE_FILE_CHARS - 1)).toEqual({ id: 'typescript', name: 'TypeScript', lite: false });
    expect(languageForPath('lib.ts', LARGE_FILE_CHARS)).toEqual({ id: 'javascript-lite', name: 'TypeScript', lite: true });
    expect(languageForPath('theme.scss', LARGE_FILE_CHARS)).toMatchObject({ id: 'css-lite', lite: true });
    expect(languageForPath('App.vue', LARGE_FILE_CHARS)).toMatchObject({ id: 'html-lite', lite: true });
    expect(languageForPath('data.json', LARGE_FILE_CHARS)).toEqual({ id: 'plaintext', name: 'JSON', lite: true });
  });
});

describe('read-only originals', () => {
  it('makes source models read-only with a message, and every other model explicitly editable', () => {
    expect(readOnlyOptionsFor({ uri: { authority: READ_ONLY_URI_AUTHORITY } })).toEqual({
      readOnly: true,
      readOnlyMessage: { value: expect.stringContaining('Go to bundle code') },
    });
    // The shared editor must never keep an original's setting for the next file.
    expect(readOnlyOptionsFor({ uri: { authority: 'tab' } })).toEqual({ readOnly: false });
    expect(readOnlyOptionsFor(null)).toEqual({ readOnly: false });
  });
});

describe('reveal requests', () => {
  const model = (name: string) => ({ name }) as unknown as monaco.editor.ITextModel;
  const editorShowing = (shown: monaco.editor.ITextModel) =>
    ({ getModel: () => shown, setPosition: vi.fn(), revealPositionInCenter: vi.fn(), focus: vi.fn() }) as unknown as monaco.editor.ICodeEditor & {
      setPosition: ReturnType<typeof vi.fn>;
      focus: ReturnType<typeof vi.fn>;
    };

  afterEach(() => {
    editorState.active = null;
    editorState.revealRequest = null;
    vi.unstubAllGlobals();
  });

  it('keeps a request for a model the editor will show, for that model only', () => {
    const a = model('a');
    requestReveal(a, { lineNumber: 5, column: 3 });
    expect(takeRevealRequest(model('b'))).toBeNull();
    // Any swap clears it.
    expect(takeRevealRequest(a)).toBeNull();
    requestReveal(a, { lineNumber: 5, column: 3 });
    expect(takeRevealRequest(a)).toEqual({ lineNumber: 5, column: 3 });
  });

  it('moves the cursor at once when the active editor already shows the model', () => {
    // Nothing else has focus, so the editor takes it.
    vi.stubGlobal('document', { activeElement: null, body: null });
    const a = model('a');
    const editor = editorShowing(a);
    editorState.active = editor;
    requestReveal(a, { lineNumber: 7, column: 1 });
    expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 7, column: 1 });
    expect(editor.focus).toHaveBeenCalled();
    expect(editorState.revealRequest).toBeNull();
  });
});
