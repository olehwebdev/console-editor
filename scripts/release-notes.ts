/**
 * Prints a release's notes: its CHANGELOG.md section (what the app shows as
 * What's New), then the download table from .github/release-notes.md.
 * Fails when CHANGELOG.md has no section for the version, so a release can't
 * go out without one.
 *
 *   node scripts/release-notes.ts 1.2.0 > notes.md
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changelogSection, VERSION_TAG_PREFIX } from '../src/shared/changelog/index.ts';

const root = join(import.meta.dirname, '..');
const version = process.argv[2]?.replace(VERSION_TAG_PREFIX, '');
if (!version) {
  console.error('Usage: node scripts/release-notes.ts <version>');
  process.exit(1);
}

const section = changelogSection(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), version);
if (!section?.body) {
  console.error(`::error file=CHANGELOG.md::CHANGELOG.md has no notes for ${version}. Add a "## [${version}] - YYYY-MM-DD" section (rename [Unreleased]).`);
  process.exit(1);
}
if (!section.date) {
  console.error(`::error file=CHANGELOG.md::The ${version} heading in CHANGELOG.md needs its date: "## [${version}] - YYYY-MM-DD".`);
  process.exit(1);
}

const downloads = readFileSync(join(root, '.github/release-notes.md'), 'utf8').replaceAll('{{version}}', version);
process.stdout.write(`${section.body}\n\n${downloads}`);
