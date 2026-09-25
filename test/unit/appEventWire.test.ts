import { describe, expect, it } from 'vitest';
import { decodeEvent, encodeEvent } from '../../src/shared/appEventWire';
import { JSON_EVENTS } from '../../src/shared/constants';
import type { AppEvent } from '../../src/shared/types';

describe('app events on their way to a window (shared/appEventWire)', () => {
  it('sends the events that can carry megabytes as JSON, and reads them back the same', () => {
    const renders: AppEvent = {
      type: 'renders-recorded',
      commits: [{ id: 1, frameId: null, at: 5, duration: null, trigger: null, action: null, components: [{ name: 'A', key: null, location: null, kind: 'mount', memo: false, duration: 0.25, reasons: [] }], more: 0 }],
    };
    const wire = encodeEvent(renders);
    expect(typeof wire).toBe('string');
    expect(decodeEvent(wire)).toEqual(renders);
    expect(JSON_EVENTS).toEqual(['renders-recorded', 'stores-recorded', 'network-requests']);
  });

  it('sends the other events as they are', () => {
    const event: AppEvent = { type: 'renders-recording', recording: true };
    expect(encodeEvent(event)).toBe(event);
    expect(decodeEvent(event)).toBe(event);
  });
});
