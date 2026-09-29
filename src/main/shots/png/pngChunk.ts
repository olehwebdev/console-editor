import { crc32 } from 'node:zlib';
import { CHUNK_PARTS } from './constants';

/** A PNG chunk: its length, type, data and the CRC of its type and data. */
export function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(CHUNK_PARTS.length + CHUNK_PARTS.type);
  head.writeUInt32BE(data.length, 0);
  head.write(type, CHUNK_PARTS.length, 'latin1');
  const crc = Buffer.alloc(CHUNK_PARTS.crc);
  crc.writeUInt32BE(crc32(data, crc32(head.subarray(CHUNK_PARTS.length))), 0);
  return Buffer.concat([head, data, crc]);
}
