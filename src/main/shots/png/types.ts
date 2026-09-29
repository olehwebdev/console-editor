/** A chunk of a PNG: its type, and its data. */
export interface PngChunk {
  type: string;
  data: Buffer;
}

/** What joining a PNG reads of it. */
export interface PngParts {
  /** The header's data (IHDR). */
  header: Buffer;
  /** The chunks between the header and the image data (colour space, density…), kept from the first part. */
  extras: PngChunk[];
  /** The image data chunks' data, in order: one zlib stream. */
  data: Buffer[];
}

/** How a PNG's rows are laid out: bytes per pixel (at least one), and per row with its filter byte. */
export interface RowLayout {
  pixelBytes: number;
  rowBytes: number;
}
