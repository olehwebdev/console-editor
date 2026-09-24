/** `//# sourceMappingURL=…` on a line of its own (`//@` is the legacy spelling). */
const LINE_SOURCE_MAP_COMMENT = /^[ \t]*\/\/[#@][ \t]*sourceMappingURL=[^\r\n]*$/gm;
/** The block comment form, as stylesheets carry it. */
const BLOCK_SOURCE_MAP_COMMENT = /\/\*[#@][ \t]*sourceMappingURL=[\s\S]*?\*\//g;

/**
 * Removes `sourceMappingURL` comments. Once a file is edited (or pretty-printed)
 * its source map no longer lines up, and DevTools would show misleading code.
 */
export function stripSourceMapComments(code: string): string {
  return code
    .replace(LINE_SOURCE_MAP_COMMENT, '')
    .replace(BLOCK_SOURCE_MAP_COMMENT, '');
}
