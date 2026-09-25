import { MAX_MAP_BYTES } from '../constants';
import type { OriginalSource, SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { lineStarts } from './align';
import { decodeDataUrl, isLibrarySource, parseSourceMap } from './parse';
import { rememberMap } from './rememberMap';
import type { LoadedMaps, Parsed } from './types';

/** Decodes a bundle's map and keeps it, answering with the files it lists (each URL once). */
export function loadMap(maps: LoadedMaps, request: SourceMapRequestOf<'load'>): SourceMapWorkerReplies['load'] {
  const { bundleUrl, mapUrl, bundle, map } = request;
  const bytes: Parsed<Uint8Array> = map.type === 'bytes' ? { ok: true, value: map.bytes } : decodeDataUrl(map.dataUrl, MAX_MAP_BYTES);
  if (!bytes.ok) return bytes;
  // An inline map's sources are relative to the bundle, as DevTools reads them.
  const parsed = parseSourceMap(bytes.value, mapUrl ?? bundleUrl);
  if (!parsed.ok) return parsed;
  const { trace, records } = parsed.value;
  const byUrl = new Map<string, number[]>();
  records.forEach((record, id) => {
    if (record.url === null) return;
    const ids = byUrl.get(record.url);
    if (ids) ids.push(id);
    else byUrl.set(record.url, [id]);
  });
  const sources: OriginalSource[] = [...byUrl].map(([url, ids]) => ({
    url,
    hasContent: ids.some((id) => records[id]!.content !== null),
    library: ids.every((id) => records[id]!.ignored) || isLibrarySource(url),
  }));
  rememberMap(maps, bundleUrl, {
    trace,
    records,
    byUrl,
    raw: bundle,
    rawLineStarts: bundle === null ? null : lineStarts(bundle),
    mapBytes: bytes.value.byteLength,
  });
  return { ok: true, sources };
}
