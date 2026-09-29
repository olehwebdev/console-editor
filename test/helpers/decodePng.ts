/**
 * Decodes an 8-bit, non-interlaced RGB or RGBA PNG (what Chromium's captures are) into RGBA pixels, so tests can
 * look at what a capture shows.
 */
import { inflateSync } from 'node:zlib';

export interface DecodedPng {
  width: number;
  height: number;
  /** The pixel at x, y as [r, g, b, a]. */
  at(x: number, y: number): [number, number, number, number];
}

const COLOR_TYPE_CHANNELS: Record<number, number> = { 2: 3, 6: 4 };

export function decodePng(bytes: Buffer): DecodedPng {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNGs');
      channels = COLOR_TYPE_CHANNELS[body[9]];
      if (!channels) throw new Error(`PNG color type ${body[9]} isn't handled`);
    } else if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const paeth = () => {
        const p = left + up - upLeft;
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
        return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      };
      const predictors = [0, left, up, (left + up) >> 1, paeth()];
      out[y * stride + x] = (value + predictors[filter]) & 0xff;
    }
  }
  return {
    width,
    height,
    at(x, y) {
      const i = y * stride + x * channels;
      return [out[i], out[i + 1], out[i + 2], channels === 4 ? out[i + 3] : 255];
    },
  };
}
