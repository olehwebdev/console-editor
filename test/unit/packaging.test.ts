import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('Linux packages', () => {
  it("give the .rpm electron-builder's own install script, then refresh GTK's icon cache", () => {
    // Kept in step with electron-builder: an upgrade that changes its template fails here until the copy follows.
    const upstream = readFileSync(join(root, 'node_modules/app-builder-lib/templates/linux/after-install.tpl'), 'utf8');
    const ours = readFileSync(join(root, 'build/linux/after-install.tpl'), 'utf8');
    expect(ours.startsWith(upstream)).toBe(true);
    expect(ours.slice(upstream.length)).toContain('gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true');
  });
});
