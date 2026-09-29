/** WebDriver BiDi's commands and events, as the protocol spells them. */
export const BIDI = {
  session: { new: 'session.new', end: 'session.end', subscribe: 'session.subscribe' },
  browsingContext: {
    activate: 'browsingContext.activate',
    captureScreenshot: 'browsingContext.captureScreenshot',
    create: 'browsingContext.create',
    getTree: 'browsingContext.getTree',
    navigate: 'browsingContext.navigate',
    reload: 'browsingContext.reload',
    setViewport: 'browsingContext.setViewport',
    // Events
    contextCreated: 'browsingContext.contextCreated',
    contextDestroyed: 'browsingContext.contextDestroyed',
    fragmentNavigated: 'browsingContext.fragmentNavigated',
    historyUpdated: 'browsingContext.historyUpdated',
    load: 'browsingContext.load',
    navigationStarted: 'browsingContext.navigationStarted',
  },
  network: {
    addIntercept: 'network.addIntercept',
    continueRequest: 'network.continueRequest',
    continueResponse: 'network.continueResponse',
    failRequest: 'network.failRequest',
    provideResponse: 'network.provideResponse',
    removeIntercept: 'network.removeIntercept',
    setCacheBehavior: 'network.setCacheBehavior',
    // Events
    beforeRequestSent: 'network.beforeRequestSent',
    responseStarted: 'network.responseStarted',
  },
  script: { addPreloadScript: 'script.addPreloadScript', evaluate: 'script.evaluate', removePreloadScript: 'script.removePreloadScript' },
} as const;

/** The phases the interception pauses requests at: before they are sent (to block or answer them), and at their response's head. */
export const INTERCEPT_PHASES = ['beforeRequestSent', 'responseStarted'] as const;

/** Cache behaviours: the network cache used as usual, or bypassed (so every request reaches the interception). */
export const CACHE_BEHAVIOR = { normal: 'default', bypass: 'bypass' } as const;

/** A BiDi message's type. */
export const MESSAGE_TYPE = { success: 'success', error: 'error', event: 'event' } as const;

/**
 * The CDP resource type the engine's matching knows for a request's `destination`; a request with none (fetch, XHR)
 * goes by its `initiatorType`, and anything else is `Other`.
 */
export const RESOURCE_TYPES: Readonly<Record<string, string>> = {
  document: 'Document',
  iframe: 'Document',
  frame: 'Document',
  style: 'Stylesheet',
  script: 'Script',
  image: 'Image',
  font: 'Font',
  audio: 'Media',
  video: 'Media',
  track: 'Media',
  fetch: 'Fetch',
  xmlhttprequest: 'XHR',
  beacon: 'Ping',
};

export const OTHER_RESOURCE = 'Other';
