import type { NavigatedFrame, NavigationContext } from './types';

/**
 * The root frame committed a new document: the list starts over with it.
 * Documents committed without a request of their own (back/forward cache,
 * about:blank) reset it too.
 */
export function commitNavigation({ frames, navigation, resources, opts }: NavigationContext, frame: NavigatedFrame): void {
  const held = navigation.commit(frame.loaderId);
  resources.clear();
  // The old document's subframes are gone (Chromium doesn't always say so); the new ones attach after this.
  frames.forgetSubframes();
  const iframeId = opts.iframe?.id;
  opts.emit({ type: 'navigated', url: frame.url, ...(iframeId ? { iframeId } : {}) });
  for (const tracked of held) resources.add(tracked);
}
