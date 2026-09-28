import { LZ4 } from './constants';

/**
 * Decompresses an LZ4 block into at most `size` bytes: sequences of literals copied as they are, each but the last
 * followed by a match copied from `offset` bytes back (overlapping copies repeat, byte by byte).
 */
export function lz4Block(input: Uint8Array, size: number): Buffer {
  const out = Buffer.alloc(size);
  let at = 0;
  let written = 0;
  // A length of 15 goes on in the bytes after it, each added, until one isn't 255.
  const length = (start: number): number => {
    if (start !== LZ4.nibble) return start;
    let total = start;
    let byte: number;
    do {
      byte = input[at++];
      total += byte;
    } while (byte === LZ4.more && at < input.length);
    return total;
  };
  while (at < input.length) {
    const token = input[at++];
    const literals = length(token >> LZ4.lengthBits);
    out.set(input.subarray(at, at + literals), written);
    at += literals;
    written += literals;
    if (at >= input.length) break;
    const offset = input[at] | (input[at + 1] << 8);
    at += LZ4.offsetBytes;
    const matched = length(token & LZ4.nibble) + LZ4.minMatch;
    if (!offset || offset > written || written + matched > size) throw new Error('Not an LZ4 block');
    for (let i = 0; i < matched; i++, written++) out[written] = out[written - offset];
  }
  return out.subarray(0, written);
}
