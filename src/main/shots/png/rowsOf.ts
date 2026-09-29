import { promisify } from 'node:util';
import { inflate } from 'node:zlib';
import { HEADER_AT } from './constants';
import { plainFirstRow } from './plainFirstRow';
import type { PngParts, RowLayout } from './types';

const unpack = promisify(inflate);

/**
 * Each part's rows, unpacked one part at a time (off the main thread, as packing them again is), its first row made to
 * read nothing of the part above.
 */
export async function* rowsOf(parts: readonly PngParts[], { pixelBytes, rowBytes }: RowLayout): AsyncGenerator<Buffer> {
  for (const part of parts) {
    const rows = await unpack(Buffer.concat(part.data));
    if (rows.length !== part.header.readUInt32BE(HEADER_AT.height) * rowBytes) throw new Error('A part of the capture came back damaged');
    plainFirstRow(rows.subarray(0, rowBytes), pixelBytes);
    yield rows;
  }
}
