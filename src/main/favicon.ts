/** Bigger downloads aren't favicons (a site that answers /favicon.ico with a page, say). */
const MAX_DOWNLOAD = 256 * 1024;
/** Images that can't be scaled down (ICO, SVG, GIF, WebP) are kept only up to this. */
const MAX_KEPT = 64 * 1024;
/** Candidates tried, in the order the page lists them. */
const MAX_CANDIDATES = 4;
/** A data URL icon of up to MAX_KEPT bytes, in base64. */
const MAX_DATA_URL = Math.ceil((MAX_KEPT * 4) / 3) + 64;

export interface FaviconDeps {
  fetch(url: string): Promise<Response>;
  /** Scales a decodable image down to a small PNG data URL; null if it can't decode it. */
  shrink(bytes: Buffer): string | null;
}

/** The image type of `bytes`, by their content (servers label favicons every which way). */
export function imageType(bytes: Buffer): string | null {
  const head = bytes.subarray(0, 12);
  if (head.subarray(0, 4).toString('hex') === '89504e47') return 'image/png';
  if (head.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (head.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  if (head.subarray(0, 4).toString('hex') === '00000100') return 'image/x-icon';
  if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  // An SVG document, perhaps after an XML declaration, comments or a doctype.
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!doctype[^>]*>\s*)*<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'))) return 'image/svg+xml';
  return null;
}

async function readCapped(res: Response, max: number): Promise<Buffer | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      void reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function download(url: string, deps: FaviconDeps): Promise<string | null> {
  if (!/^https?:/i.test(url)) return null;
  const res = await deps.fetch(url);
  if (!res.ok) {
    void res.body?.cancel().catch(() => undefined);
    return null;
  }
  const bytes = await readCapped(res, MAX_DOWNLOAD);
  const type = bytes?.length ? imageType(bytes) : null;
  if (!bytes || !type) return null;
  if (type === 'image/png' || type === 'image/jpeg') {
    const small = deps.shrink(bytes);
    if (small) return small;
  }
  return bytes.length <= MAX_KEPT ? `data:${type};base64,${bytes.toString('base64')}` : null;
}

/** An icon given inline (`<link rel="icon" href="data:image/svg+xml,…">`), kept as it is when small. */
function inline(url: string): string | null {
  return /^data:image\/[\w.+-]+[;,]/i.test(url) && url.length <= MAX_DATA_URL ? url : null;
}

/**
 * The page's favicon as a data URL, from the candidates Chromium reports for it
 * (`page-favicon-updated`: its `<link rel="icon">`s, or `/favicon.ico`), trying
 * each in turn. Null if none of them is an image.
 */
export async function loadFavicon(candidates: string[], deps: FaviconDeps): Promise<string | null> {
  for (const url of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const icon = url.startsWith('data:') ? inline(url) : await download(url, deps);
      if (icon) return icon;
    } catch {
      // Unreachable or refused: try the next one.
    }
  }
  return null;
}
