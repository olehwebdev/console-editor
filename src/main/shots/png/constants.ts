/** What every PNG starts with. */
export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The chunks a PNG is read and written by: its header, its image data (one zlib stream over all of them), its end. */
export const CHUNK = { header: 'IHDR', data: 'IDAT', end: 'IEND' } as const;

/** A chunk's bytes besides its data: its length and type before, its CRC after. */
export const CHUNK_PARTS = { length: 4, type: 4, crc: 4 } as const;

/** Where the header's fields are, in its data: width and height (32-bit), bit depth, colour type, interlace method. */
export const HEADER_AT = { width: 0, height: 4, depth: 8, colorType: 9, interlace: 12 } as const;

/** Channels per pixel by colour type: grey, RGB, grey and alpha, RGBA (a palette's isn't joined). */
export const CHANNELS_OF: Readonly<Record<number, number>> = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** The bit depths joined (whole bytes per channel), and the interlace method (none). */
export const JOINED_DEPTHS: ReadonlySet<number> = new Set([8, 16]);
export const NOT_INTERLACED = 0;

/** A row's filter type, the byte before it. */
export const FILTER = { none: 0, sub: 1, up: 2, average: 3, paeth: 4 } as const;
