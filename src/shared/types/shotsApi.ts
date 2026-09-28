import type { CaptureArea, DesignImport, Shot } from './shots';

/** Captures and designs' part of the API exposed to the renderer (`ConsoleEditorApi`). */
export interface ShotsApi {
  /** The active workspace's shots, newest first. */
  listShots(): Promise<Shot[]>;
  /** Captures the page shown, what its viewport shows or all of it, and keeps it with the workspace. */
  captureShot(area: Exclude<CaptureArea, 'element'>): Promise<Shot>;
  /** Captures a tab of a browser the app drives: what it shows, or all of it. */
  captureTabShot(browserId: string, tabId: string, area: Exclude<CaptureArea, 'element'>): Promise<Shot>;
  /** Captures the element of a pick (the inspector's), in any frame. */
  captureElementShot(pickId: string): Promise<Shot>;
  /** A shot's file, for reading its pixels. */
  readShot(id: string): Promise<Uint8Array>;
  renameShot(id: string, name: string): Promise<Shot>;
  deleteShot(id: string): Promise<void>;
  /** Shows a shot's file in the system's file manager. */
  showShotFile(id: string): Promise<void>;
  /** Asks where to save a copy of a shot's file, and saves it there; the path, or null when not saved. */
  saveShotAs(id: string): Promise<string | null>;
  /** Puts a shot's image on the clipboard. */
  copyShot(id: string): Promise<void>;
  /** Brings the editor forward showing a shot's page (from the website's own window). */
  showShot(id: string): Promise<void>;
  /** Asks for design images (PNG, JPEG, WebP) with the system's dialog, and keeps each with the workspace. */
  importDesigns(): Promise<DesignImport>;
  /** Keeps an image dropped or pasted as a design. */
  addDesign(name: string, bytes: Uint8Array): Promise<Shot>;
  /** Sets how many image pixels a design has per CSS pixel (2 for a 2× export). */
  setShotScale(id: string, scale: number): Promise<Shot>;
  /** Captures the whole page laid out at a design's width and scale, to compare them. */
  captureForDesign(designId: string): Promise<Shot>;
}
