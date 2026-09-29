/** A registry key as `reg query` printed it: its path, and its values by name in lower case. */
export interface RegKey {
  path: string;
  values: Map<string, string>;
}
