import { headerEntries, sourceMapHeader } from '../transform';

/**
 * The source map each response names, by network request. For a file served from an override it is
 * the upstream response's header, stashed as the override is served (the page's copy may have it
 * stripped); otherwise the header the page got. The stash is shared by a page's sessions, like the
 * record of which override served a request: a worker's file is served on one session and reported on another.
 */
export class UpstreamSourceMaps {
  private readonly stashed: Map<string, string>;

  constructor(shared?: Map<string, string>) {
    this.stashed = shared ?? new Map();
  }

  /** The upstream response of this network request, which an override answered, named `value`. */
  mark(networkId: string, value: string): void {
    this.stashed.set(networkId, value);
  }

  /** The map this response names, the stashed upstream one first; forgotten once taken. */
  take(networkId: string, headers: Record<string, string> | undefined): string | undefined {
    const value = this.stashed.get(networkId) ?? sourceMapHeader(headerEntries(headers));
    this.stashed.delete(networkId);
    return value;
  }

  clear(): void {
    this.stashed.clear();
  }
}
