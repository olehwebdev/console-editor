/**
 * The Chrome DevTools Protocol commands and events the engine uses, keyed by
 * domain and name as the protocol spells them: `CDP.Fetch.enable` is `Fetch.enable`.
 */
export const CDP = {
  Fetch: {
    continueRequest: 'Fetch.continueRequest',
    disable: 'Fetch.disable',
    enable: 'Fetch.enable',
    fulfillRequest: 'Fetch.fulfillRequest',
    getResponseBody: 'Fetch.getResponseBody',
    // Events
    requestPaused: 'Fetch.requestPaused',
  },
  Network: {
    enable: 'Network.enable',
    getResponseBody: 'Network.getResponseBody',
    setBypassServiceWorker: 'Network.setBypassServiceWorker',
    setCacheDisabled: 'Network.setCacheDisabled',
    // Events
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
    runIfWaitingForDebugger: 'Runtime.runIfWaitingForDebugger',
  },
  Target: {
    attachToTarget: 'Target.attachToTarget',
    detachFromTarget: 'Target.detachFromTarget',
    setAutoAttach: 'Target.setAutoAttach',
    // Events
    attachedToTarget: 'Target.attachedToTarget',
    detachedFromTarget: 'Target.detachedFromTarget',
  },
} as const;

/** Where the HTTP status classes the engine tells apart start; each ends where the next one starts. */
export const HTTP_SUCCESSFUL = 200;
export const HTTP_REDIRECTION = 300;
export const HTTP_CLIENT_ERROR = 400;

/** The Content-Type header as it is looked up: header names are matched lower-case. */
export const CONTENT_TYPE = 'content-type';

/** HTML's media type: what a document is taken to be when upstream sends no Content-Type. */
export const HTML_MIME_TYPE = 'text/html';
