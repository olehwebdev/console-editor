import type { ConsoleEditorApi } from '@common/types';

declare global {
  interface Window {
    /** Exposed by the preload script (src/preload/index.ts). */
    consoleEditor: ConsoleEditorApi;
  }
}

/** Typed bridge to the main process. Only feature/app `model` code should call it. */
export const api: ConsoleEditorApi = window.consoleEditor;
