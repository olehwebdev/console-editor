export interface PageState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  /** The page is shown in a window of its own (to move it to another screen) rather than in the editor's. */
  detached: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
