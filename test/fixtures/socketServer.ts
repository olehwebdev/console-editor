/**
 * A WebSocket endpoint for the fixture site, with no library: it greets each client, then echoes what
 * it gets (text wrapped as `{"echo": …}`, binary as it came), and closes when asked.
 */
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';

/** RFC 6455's key suffix for `Sec-WebSocket-Accept`. */
const ACCEPT_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OPCODE = { text: 1, binary: 2, close: 8 } as const;
/** What a client first gets. */
export const SOCKET_GREETING = JSON.stringify({ hello: 'client' });

interface Frame {
  opcode: number;
  payload: Buffer;
  /** Bytes the frame took in the stream. */
  size: number;
}

/** One frame from the start of `buf` (clients mask theirs), or null until all of it has arrived. */
function readFrame(buf: Buffer): Frame | null {
  if (buf.length < 2) return null;
  const opcode = buf[0]! & 0x0f;
  const masked = (buf[1]! & 0x80) !== 0;
  let length = buf[1]! & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buf.length < 4) return null;
    length = buf.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buf.length < 10) return null;
    length = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  const maskAt = offset;
  if (masked) offset += 4;
  if (buf.length < offset + length) return null;
  const payload = Buffer.from(buf.subarray(offset, offset + length));
  if (masked) for (let i = 0; i < length; i++) payload[i]! ^= buf[maskAt + (i % 4)]!;
  return { opcode, payload, size: offset + length };
}

/** A server frame (never masked). */
function frame(opcode: number, payload: Buffer): Buffer {
  const head = payload.length < 126 ? Buffer.from([0x80 | opcode, payload.length]) : Buffer.from([0x80 | opcode, 126, payload.length >> 8, payload.length & 0xff]);
  return Buffer.concat([head, payload]);
}

/** Answers WebSocket upgrades to `path` on `server`; any other upgrade is refused. */
export function attachSocketEcho(server: Server, path: string): void {
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (new URL(req.url ?? '/', 'http://localhost').pathname !== path || typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + ACCEPT_GUID).digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
    socket.write(frame(OPCODE.text, Buffer.from(SOCKET_GREETING)));
    let pending = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk]);
      for (let next = readFrame(pending); next; next = readFrame(pending)) {
        pending = pending.subarray(next.size);
        if (next.opcode === OPCODE.close) {
          socket.end(frame(OPCODE.close, Buffer.alloc(0)));
          return;
        }
        if (next.opcode === OPCODE.text) socket.write(frame(OPCODE.text, Buffer.from(JSON.stringify({ echo: next.payload.toString('utf8') }))));
        if (next.opcode === OPCODE.binary) socket.write(frame(OPCODE.binary, next.payload));
      }
    });
    socket.on('error', () => undefined);
  });
}
