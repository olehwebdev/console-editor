export interface HeaderEntry {
  name: string;
  value: string;
}

/** A body as CDP returns it: base64 for binary (and, in practice, for everything Fetch reads), or text. */
export interface RawBody {
  body: string;
  base64Encoded: boolean;
}
