/**
 * Chromium's Local Network Access checks (formerly Private Network Access)
 * decide whether a page may reach local/private addresses based on the IP the
 * page itself was served from. A document we serve through
 * `Fetch.fulfillRequest` (an HTML override, or HTML with SRI stripped) has no
 * remote IP, so Chromium treats it as public and blocks its requests to
 * loopback / intranet hosts: a patched staging page on 10.x could no longer
 * call its own APIs. This is a debugging browser for sites you control, so the
 * checks are turned off for it.
 */
export const LOCAL_NETWORK_ACCESS_FEATURES = [
  'LocalNetworkAccessChecks',
  'LocalNetworkAccessForNavigations',
  'LocalNetworkAccessForSubframeNavigations',
  'LocalNetworkAccessForWorkers',
  'BlockInsecurePrivateNetworkRequests',
  'PrivateNetworkAccessSendPreflights',
  'PrivateNetworkAccessRespectPreflightResults',
];
