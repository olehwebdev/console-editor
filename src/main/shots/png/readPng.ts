import { CHUNK, CHUNK_PARTS, PNG_SIGNATURE } from './constants';
import type { PngParts } from './types';

/** A PNG's chunks as joining it takes them: its header's data, the chunks between it and the image data, the image data. */
export function readPng(bytes: Buffer): PngParts {
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw new Error("A part of the capture isn't a PNG");
  const parts: PngParts = { header: Buffer.alloc(0), extras: [], data: [] };
  for (let at = PNG_SIGNATURE.length; at < bytes.length; ) {
    const length = bytes.readUInt32BE(at);
    const start = at + CHUNK_PARTS.length + CHUNK_PARTS.type;
    const type = bytes.toString('latin1', at + CHUNK_PARTS.length, start);
    const data = bytes.subarray(start, start + length);
    if (type === CHUNK.header) parts.header = data;
    else if (type === CHUNK.data) parts.data.push(data);
    else if (type === CHUNK.end) break;
    else if (!parts.data.length) parts.extras.push({ type, data });
    at = start + length + CHUNK_PARTS.crc;
  }
  if (!parts.header.length || !parts.data.length) throw new Error('A part of the capture came back damaged');
  return parts;
}
