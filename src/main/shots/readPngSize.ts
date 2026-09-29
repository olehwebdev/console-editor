import { PNG_SIZE_AT } from './constants';

/** A PNG's width and height, from its header. */
export function readPngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < PNG_SIZE_AT.minLength) throw new Error('The capture came back empty');
  return { width: bytes.readUInt32BE(PNG_SIZE_AT.width), height: bytes.readUInt32BE(PNG_SIZE_AT.height) };
}
