import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';

/** Downloads `url` into `file`, saying how far it got (bytes, of how many when the server says); refuses a short one. */
export async function downloadTo(url: string, file: string, progress: (done: number, total: number | null) => void): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`The download failed (${response.status}): ${url}`);
  const total = Number(response.headers.get('content-length')) || null;
  let done = 0;
  const counted = async function* (source: AsyncIterable<Buffer>) {
    for await (const chunk of source) {
      done += chunk.length;
      progress(done, total);
      yield chunk;
    }
  };
  await pipeline(Readable.fromWeb(response.body as ReadableStream), counted, createWriteStream(file));
  if (total !== null && done !== total) throw new Error(`The download was cut short: ${done} of ${total} bytes`);
}
