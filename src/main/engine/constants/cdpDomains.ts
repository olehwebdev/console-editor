/** CDP's interception, emulation, debugging and DOM domains, as the protocol spells their commands and events. */
export const CDP_DOMAINS = {
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
  Emulation: {
    clearDeviceMetricsOverride: 'Emulation.clearDeviceMetricsOverride',
    setDeviceMetricsOverride: 'Emulation.setDeviceMetricsOverride',
  },
  DOMDebugger: {
    getEventListeners: 'DOMDebugger.getEventListeners',
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
    getBoxModel: 'DOM.getBoxModel',
    getDocument: 'DOM.getDocument',
    getFrameOwner: 'DOM.getFrameOwner',
    pushNodesByBackendIdsToFrontend: 'DOM.pushNodesByBackendIdsToFrontend',
    resolveNode: 'DOM.resolveNode',
    setInspectedNode: 'DOM.setInspectedNode',
  },
  Overlay: {
    enable: 'Overlay.enable',
    disable: 'Overlay.disable',
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
} as const;
