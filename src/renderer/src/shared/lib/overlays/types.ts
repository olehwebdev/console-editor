export interface OverlayStore {
  open: number;
  change(delta: 1 | -1): void;
}
