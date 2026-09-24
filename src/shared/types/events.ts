import type { ConsoleEntry, ConsoleFrame } from './console';
import type { MenuCommand } from './menu';
import type { OverrideMeta } from './overrides';
import type { PageState } from './page';
import type { ResourceEntry } from './resources';
import type { UpdateState } from './updates';
import type { WorkspacesState } from './workspaces';

/** Events emitted by the interception engine. */
export type EngineEvent =
  /**
   * A root frame committed a new document (not merely started loading): the
   * top-level page, or a cross-site iframe's own frame when `iframeId` is set.
   * Drop the entries it owned; the new document's own entry follows.
   */
  | { type: 'navigated'; url: string; iframeId?: string }
  /** A cross-site iframe session went away (removed, reloaded, or moved to another process). */
  | { type: 'iframe-detached'; iframeId: string }
  /** An enabled override matched a file the page received unmodified (e.g. a Chromium interception gap). */
  | { type: 'override-missed'; overrideId: string; url: string }
  | { type: 'resource'; resource: ResourceEntry }
  | { type: 'override-served'; overrideId: string; url: string }
  | { type: 'upstream-changed'; overrideId: string; url: string }
  | { type: 'error'; message: string };

/** Everything the main process pushes to the renderer. */
export type AppEvent =
  | EngineEvent
  | { type: 'page-state'; state: PageState }
  /** The active workspace's overrides. */
  | { type: 'overrides-changed'; overrides: OverrideMeta[] }
  | { type: 'workspaces-changed'; state: WorkspacesState }
  /** A workspace's site icon (a data URL), or null when its page moved to another site. */
  | { type: 'workspace-favicon'; id: string; favicon: string | null }
  | { type: 'command'; command: MenuCommand }
  /** The page's frames changed: one was added, removed or loaded a new document. */
  | { type: 'frames-changed'; frames: ConsoleFrame[] }
  /** New console rows, oldest first. */
  | { type: 'console-entries'; entries: ConsoleEntry[] }
  | { type: 'console-cleared' }
  /** The window is closing: write pending drafts, then call `sessionFlushed`. */
  | { type: 'flush-session' }
  | { type: 'update'; state: UpdateState };
