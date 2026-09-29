import { FILTER } from './constants';

/**
 * How a first row filtered against the row above it (none, as the first of an image) is made to read nothing above
 * it: Up then left as it is, with no filter; Average added back to half its left neighbours, with none; Paeth, which
 * then predicts from the left neighbour alone, as Sub.
 */
const PLAIN: Readonly<Record<number, (row: Buffer, pixelBytes: number) => void>> = {
  [FILTER.up]: (row) => {
    row[0] = FILTER.none;
  },
  [FILTER.average]: (row, pixelBytes) => {
    for (let i = pixelBytes + 1; i < row.length; i++) row[i] = (row[i] + (row[i - pixelBytes] >> 1)) & 0xff;
    row[0] = FILTER.none;
  },
  [FILTER.paeth]: (row) => {
    row[0] = FILTER.sub;
  },
};

/** Makes the first row of a part (its filter byte and bytes) independent of the row above, which is the last part's. */
export function plainFirstRow(row: Buffer, pixelBytes: number): void {
  PLAIN[row[0]]?.(row, pixelBytes);
}
