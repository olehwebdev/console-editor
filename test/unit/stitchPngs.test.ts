/**
 * Joining PNG captures top to bottom (a page taller than a texture, captured in parts): rows filtered in every way the
 * format allows, the first row of each part included, come out as the pixels they were; RGB and RGBA; the first
 * part's colour space kept; parts that can't be joined refused.
 */
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { stitchPngs } from '../../src/main/shots/png';
import { decodePng } from '../helpers/decodePng';

type Color = (x: number, y: number) => number[];

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  // The CRC isn't checked when joining: any will do here.
  return Buffer.concat([head, data, Buffer.alloc(4)]);
}

/** Filters a row against the one above it (zeros for the first), as the filter type says. */
function filterRow(filter: number, row: Buffer, above: Buffer, bpp: number): Buffer {
  const out = Buffer.alloc(row.length + 1);
  out[0] = filter;
  for (let i = 0; i < row.length; i++) {
    const [a, b, c] = [i >= bpp ? row[i - bpp] : 0, above[i], i >= bpp ? above[i - bpp] : 0];
    const p = a + b - c;
    const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
    out[i + 1] = (row[i] - [0, a, b, (a + b) >> 1, paeth][filter]) & 0xff;
  }
  return out;
}

/** A PNG whose row y is filtered with `filterOf(y)`, and extra chunks before its data. */
function png(width: number, height: number, channels: 3 | 4, color: Color, filterOf: (y: number) => number, extras: Buffer[] = []): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  let above = Buffer.alloc(width * channels);
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * channels);
    for (let x = 0; x < width; x++) row.set(color(x, y).slice(0, channels), x * channels);
    rows.push(filterRow(filterOf(y), row, above, channels));
    above = row;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), ...extras, chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

// Colours that change along both axes, so every filter has something to predict.
const color: Color = (x, y) => [(x * 37 + y * 11) & 0xff, (x * 5 + y * 71) & 0xff, (x * y + 7) & 0xff, 128 + ((x + y) & 0x7f)];

describe('Joining PNG parts', () => {
  it('gives the pixels of the parts, top to bottom, whatever filter each row, a first one too, had', async () => {
    const width = 9;
    // Three parts, each starting on another filter (none, up, average, paeth, sub…), rows cycling through them all.
    const parts = [0, 2, 3, 4].map((start, i) => png(width, 5 + i, 3, (x, y) => color(x, y + 100 * i), (y) => (start + y) % 5));
    const joined = decodePng(await stitchPngs(parts));
    expect([joined.width, joined.height]).toEqual([width, 5 + 6 + 7 + 8]);
    let top = 0;
    for (const [i, rows] of [5, 6, 7, 8].entries()) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < width; x++) expect(joined.at(x, top + y)).toEqual([...color(x, y + 100 * i).slice(0, 3), 255]);
      }
      top += rows;
    }
  });

  it('joins RGBA parts, keeping the first part\'s colour space and density', async () => {
    const srgb = chunk('sRGB', Buffer.from([0]));
    const parts = [png(4, 3, 4, color, () => 3, [srgb]), png(4, 2, 4, (x, y) => color(x, y + 3), () => 4)];
    const bytes = await stitchPngs(parts);
    const joined = decodePng(bytes);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) expect(joined.at(x, y)).toEqual(color(x, y));
    expect(bytes.includes(Buffer.from('sRGB'))).toBe(true);
    expect(bytes.indexOf('sRGB')).toBeLessThan(bytes.indexOf('IDAT'));
  });

  it("refuses parts that can't be joined: of another width or format, not a PNG, or damaged", async () => {
    await expect(stitchPngs([png(4, 2, 3, color, () => 0), png(5, 2, 3, color, () => 0)])).rejects.toThrow("can't be joined");
    await expect(stitchPngs([png(4, 2, 3, color, () => 0), png(4, 2, 4, color, () => 0)])).rejects.toThrow("can't be joined");
    await expect(stitchPngs([Buffer.from('not a png')])).rejects.toThrow("isn't a PNG");
    const cut = png(4, 3, 3, color, () => 0);
    const idat = cut.indexOf('IDAT') + 4;
    const short = Buffer.concat([cut.subarray(0, idat - 8), chunk('IDAT', deflateSync(Buffer.alloc(5))), chunk('IEND', Buffer.alloc(0))]);
    await expect(stitchPngs([cut, short])).rejects.toThrow('came back damaged');
  });
});
