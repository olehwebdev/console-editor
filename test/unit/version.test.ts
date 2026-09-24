import { describe, expect, it } from 'vitest';
import { compareVersions, isNewerVersion } from '../../src/shared/version';

describe('compareVersions', () => {
  it('orders by major, minor, then patch, numerically', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('0.1.2', '0.1.10')).toBeLessThan(0);
  });

  it('reads tags with a leading v and ignores build metadata', () => {
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3+build.5', '1.2.3')).toBe(0);
  });

  it('puts a pre-release before its release, and orders pre-releases as semver does', () => {
    const sorted = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
    for (let i = 1; i < sorted.length; i++) expect(compareVersions(sorted[i - 1]!, sorted[i]!), `${sorted[i - 1]} < ${sorted[i]}`).toBeLessThan(0);
  });

  it('sorts what it cannot read first', () => {
    expect(compareVersions('nightly', '0.0.1')).toBeLessThan(0);
    expect(compareVersions('0.0.1', 'nightly')).toBeGreaterThan(0);
  });
});

describe('isNewerVersion', () => {
  it('is true only for a newer, readable version', () => {
    expect(isNewerVersion('v0.2.0', '0.1.0')).toBe(true);
    expect(isNewerVersion('0.1.0', '0.1.0')).toBe(false);
    expect(isNewerVersion('0.0.9', '0.1.0')).toBe(false);
    expect(isNewerVersion('0.2.0-beta.1', '0.2.0')).toBe(false);
    expect(isNewerVersion('latest', '0.1.0')).toBe(false);
  });
});
