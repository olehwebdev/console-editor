/**
 * Figma frames brought in as designs: the frame a link names, the form's schema, the token kept encrypted (and not
 * where the system can't encrypt it), and the import against a stand-in for Figma's API: the frame's name, its 2×
 * render downloaded without the token, a token kept only once it worked, and Figma's refusals in words.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FigmaImporter } from '../../src/main/figma';
import { FigmaToken } from '../../src/main/figma/FigmaToken';
import type { TokenCrypt } from '../../src/main/figma/types';
import { figmaFrameOf, figmaImportSchema } from '../../src/shared/figma';
import { firstIssue } from '../../src/shared/validation';
import type { Shot } from '../../src/shared/types';
import { encodePng } from '../helpers/encodePng';

const tmp = mkdtempSync(join(tmpdir(), 'console-editor-figma-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A stand-in for the system's encryption: reversible, and not the plain text. */
const crypt = (backend = 'gnome_libsecret'): TokenCrypt => ({
  isEncryptionAvailable: () => true,
  encryptString: (text) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
  decryptString: (bytes) => Buffer.from(bytes.toString().slice(4), 'base64').toString(),
  getSelectedStorageBackend: () => backend,
});

describe('A Figma link', () => {
  it('names a frame: its file (a branch\'s own) and node, as the API writes it', () => {
    expect(figmaFrameOf('https://www.figma.com/design/AbC123/Shop?node-id=12-34&t=x')).toEqual({ fileKey: 'AbC123', nodeId: '12:34' });
    expect(figmaFrameOf(' https://figma.com/file/AbC123/Shop?node-id=1%3A2 ')).toEqual({ fileKey: 'AbC123', nodeId: '1:2' });
    expect(figmaFrameOf('https://www.figma.com/proto/AbC123/Shop?node-id=5-6')).toEqual({ fileKey: 'AbC123', nodeId: '5:6' });
    expect(figmaFrameOf('https://www.figma.com/design/AbC123/branch/Br456/Shop?node-id=7-8')).toEqual({ fileKey: 'Br456', nodeId: '7:8' });
  });

  it("names none without a frame, elsewhere, or when it isn't a link", () => {
    expect(figmaFrameOf('https://www.figma.com/design/AbC123/Shop')).toBeNull();
    expect(figmaFrameOf('https://evil.test/design/AbC123/Shop?node-id=1-2')).toBeNull();
    expect(figmaFrameOf('https://www.figma.com/community/file/1?node-id=1-2')).toBeNull();
    expect(figmaFrameOf('figma frame')).toBeNull();
  });

  it('is checked with the token by one schema, the form\'s and the main process\'s', () => {
    expect(figmaImportSchema.parse({ link: ' https://www.figma.com/design/A/S?node-id=1-2 ', token: ' figd_x ', extra: 1 })).toEqual({ link: 'https://www.figma.com/design/A/S?node-id=1-2', token: 'figd_x' });
    expect(firstIssue(figmaImportSchema, { link: 'https://www.figma.com/design/A/S', token: '' })).toBe('Paste the link to a frame: select it in Figma, then Share › Copy link');
    expect(firstIssue(figmaImportSchema, { link: 'https://www.figma.com/design/A/S?node-id=1-2', token: 'x'.repeat(201) })).toBe("That isn't a Figma token");
  });
});

describe('The Figma token', () => {
  it('is kept encrypted in the data folder, read back by the next run, and forgotten', async () => {
    const file = join(tmp, 'token');
    await new FigmaToken(file, crypt()).set('figd_secret');
    expect(readFileSync(file, 'utf8')).not.toContain('figd_secret');
    const next = new FigmaToken(file, crypt());
    expect(await next.get()).toBe('figd_secret');
    await next.clear();
    expect(existsSync(file)).toBe(false);
    expect(await new FigmaToken(file, crypt()).get()).toBeNull();
  });

  it("is kept for this run only where the system can't encrypt it, and unread when it can't be decrypted", async () => {
    const file = join(tmp, 'plain');
    const unencrypted = process.platform === 'linux' ? crypt('basic_text') : { ...crypt(), isEncryptionAvailable: () => false };
    const token = new FigmaToken(file, unencrypted);
    await token.set('figd_secret');
    expect(await token.get()).toBe('figd_secret');
    expect(existsSync(file)).toBe(false);
    await new FigmaToken(file, crypt()).set('figd_secret');
    expect(await new FigmaToken(file, { ...crypt(), decryptString: () => { throw new Error('bad key'); } }).get()).toBeNull();
  });
});

describe('Importing a Figma frame', () => {
  let server: Server;
  let api: string;
  const asked: Array<{ path: string; token: string | undefined }> = [];
  const added: Array<{ name: string; bytes: Uint8Array }> = [];
  const png = encodePng(8, 6, () => [0, 128, 255]);
  const answers: Record<string, () => [number, unknown]> = {
    '/v1/files/AbC/nodes': () => [200, { nodes: { '12:34': { document: { name: 'Home / Desktop' } } } }],
    '/v1/images/AbC': () => [200, { err: null, images: { '12:34': `${api}/render/home.png` } }],
    '/v1/files/Gone/nodes': () => [404, { status: 404, err: 'Not found' }],
    '/v1/files/Blank/nodes': () => [200, { nodes: { '1:2': { document: { name: 'Blank' } } } }],
    '/v1/images/Blank': () => [200, { err: null, images: { '1:2': null } }],
  };
  const importer = (tokenFile: string) => new FigmaImporter({ tokenFile, api, crypt: crypt(), addDesign: async (name, bytes) => (added.push({ name, bytes }), { id: 's1', name } as Shot) });
  const link = (key: string, node = '12-34') => `https://www.figma.com/design/${key}/Shop?node-id=${node}`;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const { pathname } = new URL(req.url!, 'http://x');
      asked.push({ path: req.url!, token: req.headers['x-figma-token'] as string | undefined });
      if (pathname.startsWith('/render/')) return void res.writeHead(200, { 'content-type': 'image/png' }).end(png);
      if (req.headers['x-figma-token'] !== 'figd_good') return void res.writeHead(403, { 'content-type': 'application/json' }).end('{"status":403,"err":"Invalid token"}');
      const answer = answers[pathname];
      if (!answer) return void res.writeHead(404).end();
      const [status, body] = answer();
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    api = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((r) => server.close(r)));

  it("keeps the frame's 2× render as a design named after it, downloaded without the token, and then the token", async () => {
    const figma = importer(join(tmp, 'import-token'));
    expect(await figma.hasToken()).toBe(false);
    await expect(figma.import({ link: link('AbC'), token: '' })).rejects.toThrow('Figma needs a personal access token');
    expect(await figma.import({ link: link('AbC'), token: 'figd_good' })).toMatchObject({ id: 's1' });
    expect(added.at(-1)!.name).toBe('Home Desktop@2x.png');
    expect(Buffer.from(added.at(-1)!.bytes).equals(png)).toBe(true);
    expect(asked.map((a) => [a.path.split('?')[0], a.token])).toEqual([
      ['/v1/files/AbC/nodes', 'figd_good'],
      ['/v1/images/AbC', 'figd_good'],
      ['/render/home.png', undefined],
    ]);
    expect(asked[1].path).toContain('ids=12%3A34&format=png&scale=2');
    // Kept: the next import needs none.
    expect(await figma.hasToken()).toBe(true);
    await figma.import({ link: link('AbC'), token: '' });
    expect(added).toHaveLength(2);
    await figma.forgetToken();
    expect(await figma.hasToken()).toBe(false);
  });

  it("says what Figma refused, and keeps no token that didn't work", async () => {
    const figma = importer(join(tmp, 'refused-token'));
    await expect(figma.import({ link: link('AbC'), token: 'figd_bad' })).rejects.toThrow('Figma refused the token');
    expect(await figma.hasToken()).toBe(false);
    await expect(figma.import({ link: link('Gone'), token: 'figd_good' })).rejects.toThrow("Figma has no such file, or your token can't open it");
    await expect(figma.import({ link: link('AbC', '99-1'), token: 'figd_good' })).rejects.toThrow("That frame isn't in the file");
    await expect(figma.import({ link: link('Blank', '1-2'), token: 'figd_good' })).rejects.toThrow("Figma couldn't render that frame");
    await expect(figma.import({ link: 'https://www.figma.com/design/AbC/Shop', token: 'figd_good' })).rejects.toThrow('Paste the link to a frame');
    const offline = new FigmaImporter({ tokenFile: join(tmp, 'offline'), api: 'http://127.0.0.1:1', crypt: crypt(), addDesign: async () => ({}) as Shot });
    await expect(offline.import({ link: link('AbC'), token: 'figd_good' })).rejects.toThrow('Could not reach Figma');
  });
});
