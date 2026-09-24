const TAG_WITH_INTEGRITY = /<(?:script|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const INTEGRITY_ATTR = /\s+integrity\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/i;

/**
 * Removes Subresource Integrity attributes from `<script>` and `<link>` tags.
 * Without this, the browser rejects any edited script/stylesheet that the page
 * references with `integrity="sha384-..."`.
 */
export function stripIntegrityAttributes(html: string): { html: string; count: number } {
  let count = 0;
  const out = html.replace(TAG_WITH_INTEGRITY, (tag) => {
    if (!INTEGRITY_ATTR.test(tag)) return tag;
    count++;
    return tag.replace(INTEGRITY_ATTR, '');
  });
  return { html: out, count };
}
