/** A request header's value; `lowerName` must be lower-case, as `PausedRequest.headers` keys are. */
export function requestHeader(headers: Record<string, string>, lowerName: string): string | undefined {
  return Object.hasOwn(headers, lowerName) ? headers[lowerName] : undefined;
}
