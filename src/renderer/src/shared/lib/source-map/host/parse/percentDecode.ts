const PERCENT = 0x25;
const HEX_PAIR = /^[0-9a-f]{2}$/i;
const HEX = 16;

/** URL percent-decoding to bytes (the body of a data: URL that isn't base64). */
export function percentDecode(text: string): Uint8Array {
  const input = new TextEncoder().encode(text);
  const out = new Uint8Array(input.length);
  let length = 0;
  for (let i = 0; i < input.length; i++) {
    const pair = input[i] === PERCENT && i + 2 < input.length ? String.fromCharCode(input[i + 1]!, input[i + 2]!) : '';
    if (HEX_PAIR.test(pair)) {
      out[length++] = parseInt(pair, HEX);
      i += 2;
    } else {
      out[length++] = input[i]!;
    }
  }
  return out.slice(0, length);
}
