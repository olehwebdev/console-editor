/**
 * How the app pretty-prints. With these options js-beautify only ever changes whitespace, which is
 * what lets the source-map worker line a pretty-printed tab up with the minified text its map
 * describes: re-check that (test/renderer/pretty-positions) before changing them.
 */
export const BEAUTIFY_OPTIONS = { indent_size: 2, preserve_newlines: true, max_preserve_newlines: 2, end_with_newline: true };
