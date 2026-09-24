/**
 * Chromium's Local Network Access checks (formerly Private Network Access)
 * decide whether a page may reach local/private addresses based on the IP the
 * page itself was served from. A document we serve through
 * `Fetch.fulfillRequest` (an HTML override, or HTML with SRI stripped) has no
 * remote IP, so Chromium treats it as public and blocks its requests to
 * loopback / intranet hosts: a patched localhost or staging page could no
 * longer call its own APIs. Feature switches are process-wide, so the checks
 * can't be lifted for patched documents only: they are off for every page the
 * app shows, as in Chrome before Local Network Access shipped. SPEC §8 notes
 * this trade-off.
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

/** Adds features to a `--disable-features` value without dropping ones already there. */
export function withDisabledFeatures(existing: string, features: string[]): string {
  const all = new Set([...existing.split(',').map((f) => f.trim()).filter(Boolean), ...features]);
  return [...all].join(',');
}
