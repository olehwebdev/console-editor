import type { AppEvent, ConsoleFrame, Settings } from '../../shared/types';
import type { SessionKey } from '../console/ConsoleFrames';
import type { CdpTransport } from '../engine/cdp';
import type { HookScript } from './HookScript';
import type { ScriptUrls } from './reading/ScriptUrls';

/** Where the page's frames are and where their code runs: the console's, since it records them. */
export interface FrameTargets {
  list(): ConsoleFrame[];
  target(frameId: string): { sessionId: SessionKey; uniqueId: string } | undefined;
  /** The frame a context of a session belongs to (its root frame if the context isn't known). */
  frameOf(sessionId: SessionKey, contextId?: number): string | null;
}

export interface InspectorServiceOptions {
  getSettings(): Settings;
  send(event: AppEvent): void;
  frames: FrameTargets;
}

/** A session the inspector works on. */
export interface InspectedSession {
  transport: CdpTransport;
  hook: HookScript;
  scripts: ScriptUrls;
  dispose: Array<() => void>;
}

/** The inspector's sessions, as its collaborators reach them. */
export interface InspectedSessions {
  get(id: SessionKey): InspectedSession | undefined;
  all(): Array<[SessionKey, InspectedSession]>;
}

/** What a session's frame loads feed. */
export interface LoadSinks {
  /** The frame finished loading its document. */
  loaded(frameId: string): void;
  /** Its document is gone: it navigated, or it was removed. */
  gone(frameId: string): void;
}

export interface StackTrackerOptions {
  sessions: InspectedSessions;
  frames: FrameTargets;
  send(event: AppEvent): void;
}

/** What the recorders of what the framework hooks hear (renders, store actions) work with. */
export interface RecorderOptions {
  sessions: InspectedSessions;
  frames: FrameTargets;
  send(event: AppEvent): void;
}

export interface BindingRecordingOptions extends Omit<RecorderOptions, 'send'> {
  /** The binding's name: a global of each document while recording. */
  binding: string;
  /** The largest payload taken from the page. */
  maxPayload: number;
  /** Tells the renderer recording started or stopped. */
  announce(on: boolean): void;
  /** A batch arrived from a document (a session's context); batches are handled one after another. */
  received(sessionId: SessionKey, transport: CdpTransport, contextId: number, payload: string): Promise<void>;
  /** Recording started, or went on after the console recorded again: what the documents already loaded need. */
  started?(): Promise<void>;
}

export interface PickerOptions {
  sessions: InspectedSessions;
  send(event: AppEvent): void;
  /** An element was clicked while picking: its node, on the session it is in. */
  picked(sessionId: SessionKey, backendNodeId: number): void;
}

/** A picked element, kept by handle in its own object group. */
export interface Pick {
  id: string;
  sessionId: SessionKey;
  backendNodeId: number;
  objectId: string;
  group: string;
  frameId: string | null;
}
