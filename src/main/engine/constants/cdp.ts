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
    emulateNetworkConditions: 'Network.emulateNetworkConditions',
    enable: 'Network.enable',
    getRequestPostData: 'Network.getRequestPostData',
    getResponseBody: 'Network.getResponseBody',
    setBypassServiceWorker: 'Network.setBypassServiceWorker',
    setCacheDisabled: 'Network.setCacheDisabled',
    // Events
    loadingFailed: 'Network.loadingFailed',
    loadingFinished: 'Network.loadingFinished',
    requestServedFromCache: 'Network.requestServedFromCache',
    requestWillBeSent: 'Network.requestWillBeSent',
    requestWillBeSentExtraInfo: 'Network.requestWillBeSentExtraInfo',
    responseReceived: 'Network.responseReceived',
    responseReceivedExtraInfo: 'Network.responseReceivedExtraInfo',
    webSocketClosed: 'Network.webSocketClosed',
    webSocketCreated: 'Network.webSocketCreated',
    webSocketFrameError: 'Network.webSocketFrameError',
    webSocketFrameReceived: 'Network.webSocketFrameReceived',
    webSocketFrameSent: 'Network.webSocketFrameSent',
    webSocketHandshakeResponseReceived: 'Network.webSocketHandshakeResponseReceived',
    webSocketWillSendHandshakeRequest: 'Network.webSocketWillSendHandshakeRequest',
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
