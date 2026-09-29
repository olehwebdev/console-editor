import { connect } from 'node:net';
import { LISTENING_TIMEOUT_MS } from './constants';

/**
 * Whether something takes connections on a loopback port (a TCP connection opened and closed at once: nothing is sent,
 * so Chrome doesn't ask you to allow anything).
 */
export function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    const done = (listening: boolean) => {
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(LISTENING_TIMEOUT_MS, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}
