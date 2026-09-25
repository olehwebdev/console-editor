import { HTTP_SCHEME } from '../constants';
import type { SessionStore } from '../store/SessionStore';

/** A page title is kept once it has stayed this long. */
const TITLE_SETTLE_MS = 1000;

/** Records the title of the page each workspace shows, once it settles. */
export class TitleRecorder {
  /** Per workspace: switching mustn't drop the last title of the one left. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly session: SessionStore,
    /** A workspace's recorded title changed. */
    private readonly changed: () => void,
  ) {}

  /** The page at `pageUrl` shows `title`, in the workspace active now. */
  shown(pageUrl: string, title: string): void {
    // Not about:blank's (the page left as the workspace changes) or an error page's.
    if (!HTTP_SCHEME.test(pageUrl)) return;
    const id = this.session.activeId;
    clearTimeout(this.timers.get(id));
    // Some pages keep changing their title (a clock, an unread count): it is kept once it settles.
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        if (!this.session.has(id) || this.session.titleOf(id) === title.trim()) return;
        void this.session.setTitle(id, title).catch(() => undefined);
        this.changed();
      }, TITLE_SETTLE_MS),
    );
  }
}
