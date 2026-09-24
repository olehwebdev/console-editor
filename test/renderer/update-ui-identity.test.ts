import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AvailableUpdate } from '@common/types';
import { UPDATE_STATUS_ITEMS } from '@/features/update-app/ui/UpdateStatus/updateStatusItems';
import { UPDATE_STEPS } from '@/features/update-app/ui/WhatsNewPage/updateSteps';

vi.mock('@/shared/api', () => ({ api: {}, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
}));

const update = (install: 'auto' | 'manual'): AvailableUpdate => ({
  version: '0.3.0',
  notes: '',
  releaseUrl: 'https://github.com/olehwebdev/console-editor/releases/tag/v0.3.0',
  install,
  installsOnQuit: install === 'auto',
});

const element = (node: ReactNode) => {
  expect(isValidElement(node)).toBe(true);
  return node as ReactElement<{ children?: ReactNode }>;
};
/** The element types React reconciles, in order: the node's own, or a fragment's children's. */
const shape = (node: ReactNode) => Children.toArray(element(node).props.children).map((child) => element(child).type);

// React keeps a DOM node (and its focus) only while the element type in its place stays the same.
describe('update UI keeps its nodes as the update moves on', () => {
  it('shows the status-bar entry as one <button> in every state that has one', () => {
    const items = [
      UPDATE_STATUS_ITEMS.available({ status: 'available', update: update('auto') }),
      UPDATE_STATUS_ITEMS.error({ status: 'error', during: 'download', message: 'offline', update: update('auto') }),
      UPDATE_STATUS_ITEMS.downloading({ status: 'downloading', update: update('auto'), percent: 57 }),
      UPDATE_STATUS_ITEMS.ready({ status: 'ready', update: update('auto') }),
      UPDATE_STATUS_ITEMS.ready({ status: 'ready', update: update('manual'), file: '/tmp/Console Editor.dmg' }),
    ];
    for (const item of items) expect(element(item).type).toBe('button');
  });

  it('gives the What’s New card the same hint and button before and after the download', () => {
    const steps = [
      UPDATE_STEPS.available({ update: update('auto'), state: { status: 'available', update: update('auto') } }),
      UPDATE_STEPS.error({ update: update('auto'), state: { status: 'error', during: 'install', message: 'denied', update: update('auto') } }),
      UPDATE_STEPS.ready({ update: update('auto'), state: { status: 'ready', update: update('auto') } }),
      UPDATE_STEPS.ready({ update: update('manual'), state: { status: 'ready', update: update('manual'), file: '/tmp/x.AppImage' } }),
    ];
    const [first, ...rest] = steps.map(shape);
    expect(first).toHaveLength(2);
    expect(first![0]).toBe('span');
    for (const other of rest) expect(other).toEqual(first);
  });
});
