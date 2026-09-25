/**
 * `work`, unless `signal` aborts first: then it rejects with the signal's reason (calling `onAbort`
 * to stop the work), even if whatever does the work ignores the signal.
 */
export function untilAborted<T>(work: Promise<T>, signal: AbortSignal, onAbort?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      onAbort?.();
      reject(signal.reason);
    };
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
