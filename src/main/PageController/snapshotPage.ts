import type { WebContents } from 'electron';

/** Quality of the page snapshot shown under overlays. */
const SNAPSHOT_JPEG_QUALITY = 85;

/** The page as a JPEG data URL; null if nothing could be read back. */
export async function snapshotPage(wc: WebContents): Promise<string | null> {
  try {
    const image = await wc.capturePage();
    return image.isEmpty() ? null : `data:image/jpeg;base64,${image.toJPEG(SNAPSHOT_JPEG_QUALITY).toString('base64')}`;
  } catch {
    // Some GPU setups can't read the surface back; the renderer shows a plain panel instead.
    return null;
  }
}
