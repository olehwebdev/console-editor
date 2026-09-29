import { readFile } from 'node:fs/promises';
import { ClipboardItem, clipboard, nativeImage } from 'electron';

const PNG_TYPE = 'image/png';

/** Puts an image file on the clipboard as a PNG (what other apps paste), whatever type it was kept as. */
export async function copyShotImage(path: string): Promise<void> {
  const bytes = path.endsWith('.png') ? await readFile(path) : nativeImage.createFromPath(path).toPNG();
  if (!bytes.length) throw new Error("That image can't be copied");
  await clipboard.write([new ClipboardItem({ [PNG_TYPE]: new Blob([new Uint8Array(bytes)], { type: PNG_TYPE }) })]);
}
