/** An LZ4 block of literals only (no matches): valid, if not small. */
function lz4Literals(data: Buffer): Buffer {
  const head = [Math.min(data.length, 15) << 4];
  if (data.length >= 15) {
    let rest = data.length - 15;
    for (; rest >= 255; rest -= 255) head.push(255);
    head.push(rest);
  }
  return Buffer.concat([Buffer.from(head), data]);
}

/** A Firefox `.jsonlz4` file of `value` (its session file's format). */
export function mozLz4(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value));
  const size = Buffer.alloc(4);
  size.writeUInt32LE(json.length);
  return Buffer.concat([Buffer.from('mozLz40\0', 'latin1'), size, lz4Literals(json)]);
}
