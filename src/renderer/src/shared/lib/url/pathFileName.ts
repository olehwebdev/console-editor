/** Either separator of a file path: `/`, or Windows' `\`. */
const PATH_SEPARATOR = /[\\/]/;

/** A file path's last part, the file's name (`/home/me/shop.json` → `shop.json`, `C:\x\shop.json` too). */
export function pathFileName(path: string): string {
  return path.split(PATH_SEPARATOR).pop() || path;
}
