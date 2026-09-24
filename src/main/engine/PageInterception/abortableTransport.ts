import type { CdpTransport } from '../cdp';
import type { AbortableTransport } from './types';

/**
 * Wraps an iframe session's transport so that, once `gone` is called, its
 * in-flight commands reject (Chromium never answers them) and later ones fail
 * at once. In-flight commands are tracked individually (not raced against one
 * long-lived promise, which would pile up a reaction per command for the
 * session's life).
 */
export function abortableTransport(base: CdpTransport): AbortableTransport {
  const inFlight = new Set<(reason: Error) => void>();
  let goneReason: Error | undefined;
  const gone = (reason: Error) => {
    goneReason = reason;
    for (const reject of inFlight) reject(reason);
    inFlight.clear();
  };
  const transport: CdpTransport = {
    send: (method, params) =>
      goneReason
        ? Promise.reject(goneReason)
        : new Promise((resolve, reject) => {
            inFlight.add(reject);
            base.send(method, params).then(resolve, reject).finally(() => inFlight.delete(reject));
          }),
    on: base.on,
  };
  return { transport, gone };
}
