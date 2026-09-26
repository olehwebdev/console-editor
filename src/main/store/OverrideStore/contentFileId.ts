import { EXTENSIONS, ID_BYTES } from './constants';

/** An override's content file, `<id>.<ext>`: not its base (`<id>.base.<ext>`), nor a temp file on its way in. */
const CONTENT_FILE = new RegExp(`^([0-9a-f]{${ID_BYTES * 2}})\\.(?:${Object.values(EXTENSIONS).join('|')})$`);

/** The id of the override whose content file is named `name`, or null for any other file. */
export function contentFileId(name: string): string | null {
  return CONTENT_FILE.exec(name)?.[1] ?? null;
}
