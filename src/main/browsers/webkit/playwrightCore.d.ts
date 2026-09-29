/**
 * What the app uses of playwright-core's own internals, which it publishes untyped: its registry (where each browser
 * build for this system goes and comes from) and its zip extractor. Pinned in package.json: they change between
 * versions.
 */
declare module 'playwright-core/lib/coreBundle' {
  interface RegistryExecutable {
    directory: string | undefined;
    executablePath(): string | undefined;
    downloadURLs?: string[];
    browserVersion?: string;
  }
  export const registry: { registry: { findExecutable(name: string): RegistryExecutable | undefined } };
  export const utils: { extractZip(zipPath: string, options: { dir: string }): Promise<void> };
}
