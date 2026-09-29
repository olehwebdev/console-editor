import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createDeflate } from 'node:zlib';
import { CHUNK, HEADER_AT, PNG_SIGNATURE } from './constants';
import { pngChunk } from './pngChunk';
import { readPng } from './readPng';
import { rowLayoutOf } from './rowLayoutOf';
import { rowsOf } from './rowsOf';

/**
 * Joins PNGs of the same width and format, top to bottom, into one: their rows, still filtered, packed again as one
 * image (only each part's first row is changed), so no part is decoded whole. The first part's colour space and
 * density are kept.
 */
export async function stitchPngs(pngs: readonly Buffer[]): Promise<Buffer> {
  const parts = pngs.map(readPng);
  const [first] = parts;
  const layout = rowLayoutOf(first.header);
  const sameFormat = (header: Buffer) => header.readUInt32BE(HEADER_AT.width) === first.header.readUInt32BE(HEADER_AT.width) && header.subarray(HEADER_AT.depth).equals(first.header.subarray(HEADER_AT.depth));
  if (!parts.every((p) => sameFormat(p.header))) throw new Error("The capture's parts can't be joined");
  const packed: Buffer[] = [];
  await pipeline(Readable.from(rowsOf(parts, layout)), createDeflate(), async (packing: AsyncIterable<Buffer>) => {
    for await (const chunk of packing) packed.push(chunk);
  });
  const header = Buffer.from(first.header);
  header.writeUInt32BE(parts.reduce((sum, p) => sum + p.header.readUInt32BE(HEADER_AT.height), 0), HEADER_AT.height);
  const extras = first.extras.map(({ type, data }) => pngChunk(type, data));
  return Buffer.concat([PNG_SIGNATURE, pngChunk(CHUNK.header, header), ...extras, pngChunk(CHUNK.data, Buffer.concat(packed)), pngChunk(CHUNK.end, Buffer.alloc(0))]);
}
