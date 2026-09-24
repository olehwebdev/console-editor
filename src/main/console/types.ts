import type { CdpTransport } from '../engine/cdp';

/** CDP `Runtime.RemoteObject.type`. */
export type RemoteObjectType = 'object' | 'function' | 'undefined' | 'string' | 'number' | 'bigint' | 'boolean' | 'symbol';

/** CDP `Runtime.RemoteObject`: a value in the page, by copy (primitives) or by id (objects). */
export interface RemoteObject {
  type: RemoteObjectType;
  subtype?: string;
  className?: string;
  value?: unknown;
  unserializableValue?: string;
  description?: string;
  objectId?: string;
  preview?: ObjectPreview;
}

/** CDP `Runtime.ObjectPreview`: the first few properties or entries of an object. */
export interface ObjectPreview {
  type: RemoteObjectType;
  subtype?: string;
  description?: string;
  overflow: boolean;
  properties: PropertyPreview[];
  entries?: Array<{ key?: ObjectPreview; value: ObjectPreview }>;
}

export interface PropertyPreview {
  name: string;
  type: RemoteObjectType | 'accessor';
  value?: string;
  subtype?: string;
}

/** CDP `Runtime.CallFrame`; line and column count from 0. */
export interface CallFrame {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

export interface StackTrace {
  callFrames: CallFrame[];
}

/** CDP `Runtime.ExecutionContextDescription`. */
export interface ExecutionContext {
  id: number;
  origin: string;
  name: string;
  uniqueId: string;
  auxData?: { frameId?: string; isDefault?: boolean; type?: string };
}

export interface ExceptionDetails {
  text: string;
  lineNumber: number;
  columnNumber: number;
  url?: string;
  stackTrace?: StackTrace;
  exception?: RemoteObject;
  executionContextId?: number;
}

export interface ConsoleApiCalled {
  type: string;
  args: RemoteObject[];
  executionContextId: number;
  timestamp: number;
  stackTrace?: StackTrace;
}

export interface ExceptionThrown {
  timestamp: number;
  exceptionDetails: ExceptionDetails;
}

/** CDP `Log.LogEntry`, as `Log.entryAdded` carries it. */
export interface LogEntryAdded {
  entry: {
    level: string;
    text: string;
    timestamp: number;
    url?: string;
    lineNumber?: number;
    stackTrace?: StackTrace;
  };
}

export interface EvaluateReply {
  result: RemoteObject;
  exceptionDetails?: ExceptionDetails;
}

export interface GetPropertiesReply {
  result: Array<{ name: string; value?: RemoteObject }>;
  internalProperties?: Array<{ name: string; value?: RemoteObject }>;
  exceptionDetails?: ExceptionDetails;
}

/** A frame as `Page.getFrameTree` and `Page.frameNavigated` describe it. */
export interface PageFrame {
  id: string;
  parentId?: string;
  url: string;
  name?: string;
}

export interface PageFrameTree {
  frame: PageFrame;
  childFrames?: PageFrameTree[];
}

/** A frame as the console keeps it. */
export interface FrameRecord {
  id: string;
  parentId?: string;
  url: string;
  name: string;
  /** The session that hosts it: where its document runs, so where its code is evaluated. */
  sessionId: string | undefined;
  /** Its main-world JavaScript context, while it has one. */
  context?: { sessionId: string | undefined; id: number; uniqueId: string };
}

/** A CDP session the console runs on, and the listeners it added to it. */
export interface ConsoleSession {
  transport: CdpTransport;
  dispose: Array<() => void>;
}

/** An expandable value handed to the renderer: the object it stands for, and the row that holds it. */
export interface ObjectHandle {
  sessionId: string | undefined;
  objectId: string;
  entryId: number;
}
