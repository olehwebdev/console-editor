import { describe, expect, it, vi } from 'vitest';
import { imageType, loadFavicon } from '../../src/main/favicon';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const ICO = Buffer.concat([Buffer.from('00000100', 'hex'), Buffer.alloc(60)]);
const SVG = Buffer.from('<?xml version="1.0"?>\n<!-- logo --><svg xmlns="http://www.w3.org/2000/svg"></svg>');

/** Answers each URL with its body (404 for the others). */
function site(bodies: Record<string, Buffer | string>) {
  return vi.fn(async (url: string) => {
    const body = bodies[url];
    return body === undefined ? new Response('not found', { status: 404 }) : new Response(new Uint8Array(Buffer.from(body)), { headers: { 'Content-Type': 'text/plain' } });
  });
}

const deps = (fetch: ReturnType<typeof site>, shrink = vi.fn((_bytes: Buffer): string | null => 'data:image/png;base64,small')) => ({ fetch, shrink });

describe('favicons', () => {
  it('knows images by their content, not their label', () => {
    expect(imageType(PNG)).toBe('image/png');
    expect(imageType(ICO)).toBe('image/x-icon');
    expect(imageType(SVG)).toBe('image/svg+xml');
    expect(imageType(Buffer.from('<!doctype html><html><body><svg></svg>'))).toBeNull();
    expect(imageType(Buffer.from('not found'))).toBeNull();
  });

  it('takes the first candidate that is an image, scaling down what it can decode', async () => {
    const fetch = site({ 'https://a.com/icon.png': PNG });
    const shrink = vi.fn(() => 'data:image/png;base64,small');
    const icon = await loadFavicon(['https://a.com/missing.png', 'https://a.com/icon.png'], deps(fetch, shrink));
    expect(icon).toBe('data:image/png;base64,small');
    expect(shrink).toHaveBeenCalledWith(PNG);
  });

  it('keeps small images it cannot decode as they are, and skips pages served as icons', async () => {
    const fetch = site({ 'https://a.com/favicon.ico': ICO, 'https://a.com/page': '<!doctype html>', 'https://a.com/logo.svg': SVG });
    expect(await loadFavicon(['https://a.com/page', 'https://a.com/favicon.ico'], deps(fetch))).toBe(`data:image/x-icon;base64,${ICO.toString('base64')}`);
    expect(await loadFavicon(['https://a.com/logo.svg'], deps(fetch))).toBe(`data:image/svg+xml;base64,${SVG.toString('base64')}`);
  });

  it('refuses huge files and non-http candidates, and gives null when nothing loads', async () => {
    const huge = Buffer.concat([ICO, Buffer.alloc(300 * 1024)]);
    const fetch = site({ 'https://a.com/huge.ico': huge });
    expect(await loadFavicon(['https://a.com/huge.ico', 'file:///etc/passwd', 'javascript:1'], deps(fetch))).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await loadFavicon(['https://a.com/favicon.ico'], { fetch: failing, shrink: () => null })).toBeNull();
  });

  it('keeps an inline data URL icon without fetching it', async () => {
    const fetch = site({});
    const inline = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='.9em'>🚀</text></svg>";
    expect(await loadFavicon([inline], deps(fetch))).toBe(inline);
    expect(await loadFavicon(['data:text/html,<script>1</script>'], deps(fetch))).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
