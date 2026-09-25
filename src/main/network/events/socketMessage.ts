import { MAX_SOCKET_MESSAGE_CHARS, MAX_SOCKET_MESSAGES } from '../../../shared/constants';
import type { SocketDirection } from '../../../shared/types';
import { BINARY_OPCODE, MS_PER_SECOND } from '../constants';
import type { NetworkLogContext, SocketEvent } from '../types';

/** A frame a socket sent or received: kept (the latest `MAX_SOCKET_MESSAGES`, each cut at `MAX_SOCKET_MESSAGE_CHARS`), and counted on its row. */
export function socketMessage({ log, batch }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined, direction: SocketDirection): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry?.messages) return;
  const payload = p.response?.payloadData ?? '';
  const binary = p.response?.opcode === BINARY_OPCODE;
  const length = binary ? Buffer.byteLength(payload, 'base64') : payload.length;
  const at = entry.sentAt && p.timestamp !== undefined ? entry.row.startedAt + Math.round((p.timestamp - entry.sentAt) * MS_PER_SECOND) : Date.now();
  const truncated = payload.length > MAX_SOCKET_MESSAGE_CHARS;
  entry.messages.push({ direction, at, binary, data: truncated ? payload.slice(0, MAX_SOCKET_MESSAGE_CHARS) : payload, length, ...(truncated ? { truncated } : {}) });
  if (entry.messages.length > MAX_SOCKET_MESSAGES) entry.messages.shift();
  entry.row.messages = (entry.row.messages ?? 0) + 1;
  entry.row.size = (entry.row.size ?? 0) + length;
  batch.changed(entry.row.id);
}
