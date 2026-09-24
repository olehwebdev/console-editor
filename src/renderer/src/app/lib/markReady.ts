/** Tests and the packaged smoke run wait for this: the initial state has loaded. */
export function markReady(): void {
  document.body.dataset.ready = 'true';
}
