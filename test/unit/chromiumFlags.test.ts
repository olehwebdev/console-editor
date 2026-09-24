import { describe, expect, it } from 'vitest';
import { LOCAL_NETWORK_ACCESS_FEATURES, withDisabledFeatures } from '../../src/main/chromiumFlags';

describe('withDisabledFeatures', () => {
  it('adds the features to an empty value', () => {
    expect(withDisabledFeatures('', ['A', 'B'])).toBe('A,B');
  });

  it("keeps features already disabled, without duplicates", () => {
    expect(withDisabledFeatures('X, A', ['A', 'B'])).toBe('X,A,B');
  });

  it('never disables features the app needs (RenderDocument off crashes Electron with iframe sessions)', () => {
    const value = withDisabledFeatures('PaintHolding,RenderDocument,Translate', LOCAL_NETWORK_ACCESS_FEATURES);
    expect(value.split(',')).not.toContain('RenderDocument');
    expect(value.split(',')).toEqual(expect.arrayContaining(['PaintHolding', 'Translate', ...LOCAL_NETWORK_ACCESS_FEATURES]));
  });
});
