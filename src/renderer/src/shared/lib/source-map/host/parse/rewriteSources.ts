import { MAX_SECTION_DEPTH } from '../../constants';
import type { Parsed, SourceRecord } from '../types';
import { invalidMap } from './invalidMap';
import { resolveSourceUrl } from './resolveSourceUrl';

type RawMap = Record<string, unknown>;

/**
 * Checks a map's shape and replaces every (section's) source with a synthetic id, its index in
 * `records`, which gets its resolved URL, text and ignore-listing. Lookups then go by index: the
 * parser's own URL handling and first-match lookups can't mix up repeated or oddly named sources.
 */
export function rewriteSources(json: unknown, baseUrl: string, records: SourceRecord[], depth = 0): Parsed<RawMap> {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return invalidMap('the source map is not a JSON object');
  const map = json as RawMap;
  if (map.sections !== undefined) {
    if (!Array.isArray(map.sections)) return invalidMap('its sections are not a list');
    if (depth >= MAX_SECTION_DEPTH) return invalidMap('its sections are nested too deeply');
    const sections: RawMap[] = [];
    for (const section of map.sections as unknown[]) {
      if (typeof section !== 'object' || section === null) return invalidMap('a section is not an object');
      // Sections that point at another map by URL aren't in the spec; DevTools doesn't read them either.
      if ('url' in section) return { ok: false, failure: 'unsupported-sections', detail: '' };
      const { offset, map: inner } = section as { offset?: { line?: unknown; column?: unknown }; map?: unknown };
      if (typeof offset?.line !== 'number' || typeof offset.column !== 'number') return invalidMap('a section has no offset');
      const rewritten = rewriteSources(inner, baseUrl, records, depth + 1);
      if (!rewritten.ok) return rewritten;
      sections.push({ offset: { line: offset.line, column: offset.column }, map: rewritten.value });
    }
    return { ok: true, value: { version: 3, sections } };
  }
  if (typeof map.mappings !== 'string') return invalidMap('its mappings are not a string');
  if (!Array.isArray(map.sources)) return invalidMap('its sources are not a list');
  const sourceRoot = typeof map.sourceRoot === 'string' ? map.sourceRoot : undefined;
  const contents: unknown[] = Array.isArray(map.sourcesContent) ? map.sourcesContent : [];
  const ignoreList = map.ignoreList ?? map.x_google_ignoreList;
  const ignored = new Set<unknown>(Array.isArray(ignoreList) ? ignoreList : []);
  const sources = (map.sources as unknown[]).map((source, index) => {
    const content = contents[index];
    records.push({
      url: typeof source === 'string' ? resolveSourceUrl(source, sourceRoot, baseUrl) : null,
      content: typeof content === 'string' ? content : null,
      ignored: ignored.has(index),
    });
    return String(records.length - 1);
  });
  return { ok: true, value: { version: 3, sources, mappings: map.mappings, names: Array.isArray(map.names) ? map.names : [] } };
}
