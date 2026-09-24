/** Window-relative CSS-pixel rectangle; the same shape as the page bounds sent to the main process. */
export interface NativeViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
