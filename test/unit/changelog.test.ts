import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { changelogSection, parseChangelog } from '../../src/shared/changelog';

const root = join(import.meta.dirname, '../..');

const SAMPLE = `# Changelog

Intro text that belongs to no release.

## [Unreleased]

- Work in progress.

## [1.1.0] - 2026-10-02

### Fixed

- A bug, see [the issue](https://example.com/1).

## [v1.0.0] - 2026-09-24

First release.

[Unreleased]: https://example.com/compare/v1.1.0...HEAD
[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
[1.0.0]: https://example.com/releases/v1.0.0
`;

describe('parseChangelog', () => {
  it('splits the file into releases, newest first, without headings or link definitions', () => {
    expect(parseChangelog(SAMPLE)).toEqual([
      { version: 'Unreleased', date: null, body: '- Work in progress.' },
      { version: '1.1.0', date: '2026-10-02', body: '### Fixed\n\n- A bug, see [the issue](https://example.com/1).' },
      { version: '1.0.0', date: '2026-09-24', body: 'First release.' },
    ]);
  });

  it('reads Windows line endings', () => {
    expect(parseChangelog(SAMPLE.replace(/\n/g, '\r\n'))[1]?.body).toBe('### Fixed\n\n- A bug, see [the issue](https://example.com/1).');
  });
});

describe('changelogSection', () => {
  it('finds a version with or without its v', () => {
    expect(changelogSection(SAMPLE, 'v1.1.0')?.date).toBe('2026-10-02');
    expect(changelogSection(SAMPLE, '1.0.0')?.body).toBe('First release.');
    expect(changelogSection(SAMPLE, '2.0.0')).toBeNull();
  });
});

describe('CHANGELOG.md', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };

  it('has a dated section with notes for every release', () => {
    const releases = parseChangelog(changelog).filter((entry) => entry.version !== 'Unreleased');
    expect(releases.length).toBeGreaterThan(0);
    for (const entry of releases) {
      expect(entry.date, entry.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.body, entry.version).not.toBe('');
    }
  });

  it("covers package.json's version, released or about to be", () => {
    const entries = parseChangelog(changelog);
    expect(entries.some((entry) => entry.version === version || entry.version === 'Unreleased')).toBe(true);
  });
});
