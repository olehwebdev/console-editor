import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceEntry } from '../../src/shared/types';
import { selectUniqueResources, useResourceStore } from '@/entities/resource';
import { FILES_REFRESH_MS, watchPageFiles } from '@/widgets/command-palette/model/files';

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
