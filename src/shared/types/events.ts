import type { ActionsWindowState, ConsoleAction } from './actions';
import type { HeldRequest } from './breakpoints';
import type { ConsoleEntry, ConsoleFrame } from './console';
import type { FrameStack, InspectedComponent, InspectHover, RenderCommit } from './inspector';
import type { MenuCommand } from './menu';
import type { NetworkRequest } from './network';
import type { OverrideMeta, UnpatchedReason } from './overrides';
import type { PageState } from './page';
import type { ResourceEntry } from './resources';
import type { Rule } from './rules';
import type { Settings } from './settings';
import type { UpdateState } from './updates';
import type { MissedReason } from './workers';
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
  /** A worker session went away (terminated, its page left, or a new service worker version took over). */
  | { type: 'worker-detached'; workerId: string }
  /** An enabled override matched a file the page received unmodified (e.g. a Chromium interception gap). */
  | { type: 'override-missed'; overrideId: string; url: string; reason?: MissedReason }
  | { type: 'resource'; resource: ResourceEntry }
  /** An override answered a request; `requestId` is its network request id, when Chromium gave one. */
  | { type: 'override-served'; overrideId: string; url: string; requestId?: string }
  | { type: 'upstream-changed'; overrideId: string; url: string }
  /** A response override set to patch the live response couldn't, and answered with its saved text instead. */
  | { type: 'override-unpatched'; overrideId: string; url: string; reason: UnpatchedReason }
  /** A rule blocked a request, or changed its response's headers (one event per rule that changed something). */
  | { type: 'rule-applied'; ruleId: string; url: string }
  /** An enabled block rule matched a listed file that arrived anyway (it loaded before the rule applied, or a Chromium interception gap). */
  | { type: 'rule-missed'; ruleId: string; url: string }
  | { type: 'error'; message: string };

/** Everything the main process pushes to the renderer. */
export type AppEvent =
  | EngineEvent
  | { type: 'page-state'; state: PageState }
  /** The active workspace's overrides. */
  | { type: 'overrides-changed'; overrides: OverrideMeta[] }
  /** The active workspace's rules, oldest first. */
  | { type: 'rules-changed'; rules: Rule[] }
  | { type: 'workspaces-changed'; state: WorkspacesState }
  /** A workspace's site icon (a data URL), or null when its page moved to another site. */
  | { type: 'workspace-favicon'; id: string; favicon: string | null }
  | { type: 'command'; command: MenuCommand }
  /** The page's frames changed: one was added, removed or loaded a new document. */
  | { type: 'frames-changed'; frames: ConsoleFrame[] }
  /** New console rows, oldest first. */
  | { type: 'console-entries'; entries: ConsoleEntry[] }
  | { type: 'console-cleared' }
  /** A frame's stack was found, or went with its document: every frame's, the top page first. */
  | { type: 'stack-changed'; stacks: FrameStack[] }
  /** Picking an element in the page started or stopped. */
  | { type: 'inspect-picking'; picking: boolean }
  /** What is under the pointer while picking; null when nothing is. */
  | { type: 'inspect-hover'; hover: InspectHover | null }
  /** An element was picked: the component that rendered it. */
  | { type: 'inspect-picked'; component: InspectedComponent }
  /** Renders started or stopped being recorded. */
  | { type: 'renders-recording'; recording: boolean }
  /** React commits recorded in the page's frames, in order, as they arrive (batched). */
  | { type: 'renders-recorded'; commits: RenderCommit[] }
  /** The active workspace's actions: one was added, changed or deleted, or another workspace became active. */
  | { type: 'actions-changed'; actions: ConsoleAction[] }
  /** Requests new to the log, or changed (a response arrived, it finished or failed), oldest first. */
  | { type: 'network-requests'; requests: NetworkRequest[] }
  | { type: 'network-cleared' }
  /** The requests breakpoints hold now, oldest first: one was stopped, or let go (by you, or the page gave up on it). */
  | { type: 'held-requests'; held: HeldRequest[] }
  /** The Actions panel moved into its own window or back, or that window's Keep on top changed. */
  | { type: 'actions-window'; state: ActionsWindowState }
  /** A window changed the settings (the others show them as they are now). */
  | { type: 'settings-changed'; settings: Settings }
  /** The window is closing: write pending drafts, then call `sessionFlushed`. */
  | { type: 'flush-session' }
  | { type: 'update'; state: UpdateState };
