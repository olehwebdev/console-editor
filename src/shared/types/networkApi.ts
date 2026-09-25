import type { HeldAction, HeldRequest } from './breakpoints';
import type { HarImport, NetworkBody, NetworkRequest, NetworkRequestDetail, SocketMessages } from './network';

/** The Network panel's part of the API exposed to the renderer (`ConsoleEditorApi`). */
export interface NetworkApi {
  /** The requests kept so far (the most recent `MAX_NETWORK_REQUESTS`), oldest first. */
  listNetworkRequests(): Promise<NetworkRequest[]>;
  /** A request's headers and body. Throws for a request no longer kept. */
  getNetworkRequest(id: string): Promise<NetworkRequestDetail>;
  /** A response's body, read through the session that received it; never an open event stream's. */
  getNetworkResponseBody(id: string): Promise<NetworkBody>;
  /**
   * Asks where to save the requests with these ids (the ones the panel shows) as a HAR file, and saves
   * them there with the bodies that can still be read. The file's path, or null when not saved.
   */
  exportHar(ids: string[]): Promise<string | null>;
  /**
   * Asks for a HAR file and makes a response override (answered without sending the request) of each
   * fetch() or XHR response in it. Null when none was picked.
   */
  importHar(): Promise<HarImport | null>;
  /**
   * A WebSocket's messages from number `from` on (0: every one kept), oldest first; the oldest go once
   * it has more than `MAX_SOCKET_MESSAGES`. Throws for a request no longer kept.
   */
  getNetworkMessages(id: string, from: number): Promise<SocketMessages>;
  clearNetworkLog(): Promise<void>;
  /** The requests breakpoints hold now, oldest first. */
  listHeldRequests(): Promise<HeldRequest[]>;
  /** Lets a held request go, as `action` says. Throws for one no longer held (answered, or given up by the page). */
  resumeHeldRequest(id: string, action: HeldAction): Promise<void>;
}
