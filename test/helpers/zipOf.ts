import { yazl } from 'playwright-core/lib/utilsBundle';

/** A zip of the files given (with a Unix mode when one is), as a stand-in for a browser build's download. */
export async function zipOf(files: Array<{ name: string; data: Buffer; mode?: number; compress?: boolean }>): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  for (const { name, data, mode, compress } of files) zip.addBuffer(data, name, { ...(mode === undefined ? {} : { mode }), ...(compress === undefined ? {} : { compress }) });
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}
