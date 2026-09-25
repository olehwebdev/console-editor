import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrameStack, StackHit } from '../../src/shared/types';
import { useTabStore } from '@/entities/editor-tab';
import { selectUiLibraries, sortHits, usePageStackStore } from '@/entities/page-stack';
import { openPageStack } from '@/features/inspect/stack';

// The tab store's model registry loads Monaco, which needs a browser; the Page stack has no model.
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript' }));
vi.mock('@/shared/api', () => ({ api: {}, onAppEvent: () => () => {} }));

const hit = (id: StackHit['id'], signal: string, version: string | null = null): StackHit => ({ id, signal, version, build: null });
const stack = (frameId: string, hits: StackHit[]): FrameStack => ({ frameId, url: `https://${frameId}.test/`, hits, scannedAt: 1 });

describe('page stack', () => {
  beforeEach(() => {
    usePageStackStore.setState({ stacks: [] });
    useTabStore.setState({ tabs: [], sources: [], pages: [], activeId: null });
  });

  it('names the UI libraries the page runs once each, the top page first, leaving out frameworks, state and bundlers', () => {
    usePageStackStore.getState().setAll([
      stack('top', [hit('webpack', 'chunks'), hit('angular', 'attribute', '22.2.0')]),
      stack('cart', [hit('react', 'hook', '19.3.0'), hit('next', 'data'), hit('mobx', 'global')]),
      stack('billing', [hit('vue', 'app', '3.5.43'), hit('pinia', 'vue')]),
      stack('nav', [hit('react', 'fiber')]),
      stack('legacy', [hit('vue2', 'instance', '2.7.16')]),
    ]);
    expect(selectUiLibraries(usePageStackStore.getState())).toEqual(['Angular', 'React', 'Vue']);
  });

  it('lists a frame UI library first, then its framework, state library and bundler', () => {
    const sorted = sortHits([hit('vite', 'client'), hit('pinia', 'vue'), hit('nuxt', 'root'), hit('vue', 'app')]);
    expect(sorted.map((h) => h.id)).toEqual(['vue', 'nuxt', 'pinia', 'vite']);
  });

  it('opens the Page stack once, however often it is asked for', () => {
    openPageStack();
    openPageStack();
    const { pages, activeId } = useTabStore.getState();
    expect(pages).toEqual([{ id: 'page:stack', page: 'stack', title: 'Page stack' }]);
    expect(activeId).toBe('page:stack');
  });
});
