import type { AppEvent, ConsoleFrame, Settings } from '../../shared/types';
import type { SessionKey } from '../console/ConsoleFrames';
import type { CdpTransport } from '../engine/cdp';
import type { HookScript } from './HookScript';

/** Where the page's frames are and where their code runs: the console's, since it records them. */
export interface FrameTargets {
  list(): ConsoleFrame[];
  target(frameId: string): { sessionId: SessionKey; uniqueId: string } | undefined;
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
  dispose: Array<() => void>;
}

/** What a session's frame loads feed. */
export interface LoadSinks {
  /** The frame finished loading its document. */
  loaded(frameId: string): void;
  /** Its document is gone: it navigated, or it was removed. */
  gone(frameId: string): void;
}
