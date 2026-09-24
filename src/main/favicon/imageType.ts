import { IMAGE_TYPE } from './constants';
import type { ImageType } from './types';

/** How each binary format's files begin: the bytes found at each offset. */
const SIGNATURES: Array<{ type: ImageType; marks: Array<{ at: number; bytes: Buffer }> }> = [
  { type: IMAGE_TYPE.png, marks: [{ at: 0, bytes: Buffer.from('89504e47', 'hex') }] },
  { type: IMAGE_TYPE.jpeg, marks: [{ at: 0, bytes: Buffer.from('ffd8ff', 'hex') }] },
  { type: IMAGE_TYPE.gif, marks: [{ at: 0, bytes: Buffer.from('GIF8', 'latin1') }] },
  { type: IMAGE_TYPE.ico, marks: [{ at: 0, bytes: Buffer.from('00000100', 'hex') }] },
  {
    type: IMAGE_TYPE.webp,
    marks: [
      { at: 0, bytes: Buffer.from('RIFF', 'latin1') },
      { at: 8, bytes: Buffer.from('WEBP', 'latin1') },
    ],
  },
];

/** An SVG document, perhaps after an XML declaration, comments or a doctype. */
const SVG_START = /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!doctype[^>]*>\s*)*<svg[\s>]/i;
/** How much of a file is searched for SVG's start. */
const SVG_SNIFF_BYTES = 4096;

/** The image type of `bytes`, by their content (servers label favicons every which way). */
export function imageType(bytes: Buffer): ImageType | null {
  const found = SIGNATURES.find(({ marks }) => marks.every((mark) => bytes.subarray(mark.at, mark.at + mark.bytes.length).equals(mark.bytes)));
  if (found) return found.type;
  return SVG_START.test(bytes.subarray(0, SVG_SNIFF_BYTES).toString('utf8')) ? IMAGE_TYPE.svg : null;
}
