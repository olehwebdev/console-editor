import type { WorkerType } from '../../shared/types';

/**
 * The Chrome DevTools Protocol commands and events the engine uses, keyed by
 * domain and name as the protocol spells them: `CDP.Fetch.enable` is `Fetch.enable`.
 */
export const CDP = {
  Fetch: {
    continueRequest: 'Fetch.continueRequest',
    continueResponse: 'Fetch.continueResponse',
    disable: 'Fetch.disable',
    enable: 'Fetch.enable',
    failRequest: 'Fetch.failRequest',
    fulfillRequest: 'Fetch.fulfillRequest',
    getResponseBody: 'Fetch.getResponseBody',
    // Events
    requestPaused: 'Fetch.requestPaused',
  },
  Debugger: {
    disable: 'Debugger.disable',
    enable: 'Debugger.enable',
    setSkipAllPauses: 'Debugger.setSkipAllPauses',
    // Events
    scriptParsed: 'Debugger.scriptParsed',
  },
  DOM: {
    describeNode: 'DOM.describeNode',
    enable: 'DOM.enable',
    getDocument: 'DOM.getDocument',
    getFrameOwner: 'DOM.getFrameOwner',
    pushNodesByBackendIdsToFrontend: 'DOM.pushNodesByBackendIdsToFrontend',
    resolveNode: 'DOM.resolveNode',
    setInspectedNode: 'DOM.setInspectedNode',
  },
  Overlay: {
    enable: 'Overlay.enable',
    hideHighlight: 'Overlay.hideHighlight',
    highlightNode: 'Overlay.highlightNode',
    setInspectMode: 'Overlay.setInspectMode',
    // Events
    inspectModeCanceled: 'Overlay.inspectModeCanceled',
    inspectNodeRequested: 'Overlay.inspectNodeRequested',
    nodeHighlightRequested: 'Overlay.nodeHighlightRequested',
  },
  Inspector: {
    enable: 'Inspector.enable',
    // Events
    targetCrashed: 'Inspector.targetCrashed',
    targetReloadedAfterCrash: 'Inspector.targetReloadedAfterCrash',
    workerScriptLoaded: 'Inspector.workerScriptLoaded',
  },
  Network: {
    enable: 'Network.enable',
    getResponseBody: 'Network.getResponseBody',
    setBypassServiceWorker: 'Network.setBypassServiceWorker',
    setCacheDisabled: 'Network.setCacheDisabled',
    // Events
    loadingFinished: 'Network.loadingFinished',
    requestWillBeSent: 'Network.requestWillBeSent',
    responseReceived: 'Network.responseReceived',
  },
  Page: {
    addScriptToEvaluateOnNewDocument: 'Page.addScriptToEvaluateOnNewDocument',
    enable: 'Page.enable',
    getFrameTree: 'Page.getFrameTree',
    getResourceContent: 'Page.getResourceContent',
    removeScriptToEvaluateOnNewDocument: 'Page.removeScriptToEvaluateOnNewDocument',
    setBypassCSP: 'Page.setBypassCSP',
    // Events
    frameAttached: 'Page.frameAttached',
    frameDetached: 'Page.frameDetached',
    frameNavigated: 'Page.frameNavigated',
    frameStoppedLoading: 'Page.frameStoppedLoading',
  },
  Runtime: {
    addBinding: 'Runtime.addBinding',
    removeBinding: 'Runtime.removeBinding',
    disable: 'Runtime.disable',
    discardConsoleEntries: 'Runtime.discardConsoleEntries',
    enable: 'Runtime.enable',
    callFunctionOn: 'Runtime.callFunctionOn',
    evaluate: 'Runtime.evaluate',
    getProperties: 'Runtime.getProperties',
    releaseObjectGroup: 'Runtime.releaseObjectGroup',
    runIfWaitingForDebugger: 'Runtime.runIfWaitingForDebugger',
    // Events
    bindingCalled: 'Runtime.bindingCalled',
    consoleAPICalled: 'Runtime.consoleAPICalled',
    exceptionThrown: 'Runtime.exceptionThrown',
    executionContextCreated: 'Runtime.executionContextCreated',
    executionContextDestroyed: 'Runtime.executionContextDestroyed',
    executionContextsCleared: 'Runtime.executionContextsCleared',
  },
  Log: {
    clear: 'Log.clear',
    disable: 'Log.disable',
    enable: 'Log.enable',
    // Events
    entryAdded: 'Log.entryAdded',
  },
  ServiceWorker: {
    disable: 'ServiceWorker.disable',
    enable: 'ServiceWorker.enable',
    unregister: 'ServiceWorker.unregister',
    // Events
    workerRegistrationUpdated: 'ServiceWorker.workerRegistrationUpdated',
    workerVersionUpdated: 'ServiceWorker.workerVersionUpdated',
  },
  Target: {
    attachToTarget: 'Target.attachToTarget',
    detachFromTarget: 'Target.detachFromTarget',
    getTargetInfo: 'Target.getTargetInfo',
    setAutoAttach: 'Target.setAutoAttach',
    setDiscoverTargets: 'Target.setDiscoverTargets',
    // Events
    attachedToTarget: 'Target.attachedToTarget',
    detachedFromTarget: 'Target.detachedFromTarget',
    targetCreated: 'Target.targetCreated',
    targetDestroyed: 'Target.targetDestroyed',
  },
} as const;

/** The CDP target types the engine tells apart: an out-of-process iframe's, and each kind of worker's. */
export const TARGET_TYPE = {
  iframe: 'iframe',
  worker: 'worker',
  sharedWorker: 'shared_worker',
  serviceWorker: 'service_worker',
  worklet: 'worklet',
} as const satisfies Record<string, 'iframe' | WorkerType>;

/** `Page.frameDetached` reason of a frame that moved to another process (it still exists). */
export const FRAME_SWAP_REASON = 'swap';

/** Where the HTTP status classes the engine tells apart start; each ends where the next one starts. */
export const HTTP_SUCCESSFUL = 200;
export const HTTP_REDIRECTION = 300;
export const HTTP_CLIENT_ERROR = 400;

/** The Content-Type header as it is looked up: header names are matched lower-case. */
export const CONTENT_TYPE = 'content-type';

/** HTML's media type: what a document is taken to be when upstream sends no Content-Type. */
export const HTML_MIME_TYPE = 'text/html';

/** Fetch.failRequest's reason for a request a rule blocked (shows as net::ERR_BLOCKED_BY_CLIENT). */
export const BLOCKED_BY_CLIENT = 'BlockedByClient';
