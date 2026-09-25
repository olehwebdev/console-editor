export interface PageState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
