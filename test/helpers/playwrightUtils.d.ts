/** What the tests use of playwright-core's bundled libraries, which it publishes untyped: yazl, to write zips. */
declare module 'playwright-core/lib/utilsBundle' {
  export const yazl: {
    ZipFile: new () => {
      addBuffer(data: Buffer, name: string, options?: { mode?: number; compress?: boolean }): void;
      end(): void;
      outputStream: NodeJS.ReadableStream;
    };
  };
}
