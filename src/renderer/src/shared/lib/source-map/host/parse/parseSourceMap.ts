import { AnyMap, type SectionedSourceMapInput, type TraceMap } from '@jridgewell/trace-mapping';
import type { Parsed, SourceRecord } from '../types';
import { invalidMap } from './invalidMap';
import { mapText } from './mapText';
import { rewriteSources } from './rewriteSources';

/** Reads a map's bytes: sources resolved against `baseUrl` (the map's URL, or the bundle's for an inline map). */
export function parseSourceMap(bytes: Uint8Array, baseUrl: string): Parsed<{ trace: TraceMap; records: SourceRecord[] }> {
  const text = mapText(bytes);
  if (!text.ok) return text;
  const records: SourceRecord[] = [];
  const rewritten = rewriteSources(text.value, baseUrl, records);
  if (!rewritten.ok) return rewritten;
  try {
    // The ids are resolved against nothing, so they stay ids.
    return { ok: true, value: { trace: new AnyMap(rewritten.value as unknown as SectionedSourceMapInput, null), records } };
  } catch (err) {
    return invalidMap(err instanceof Error ? err.message : String(err));
  }
}
