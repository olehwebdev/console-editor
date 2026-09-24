import type { AppEvent, ConsoleEditorApi } from '@common/types';

declare global {
  interface Window {
    /** Exposed by the preload script (src/preload/index.ts). */
    consoleEditor: ConsoleEditorApi;
  }
}

/** Typed bridge to the main process. Only feature/app `model` code should call it. */
export const api: ConsoleEditorApi = window.consoleEditor;

export function onAppEvent(listener: (event: AppEvent) => void): () => void {
  return api.onEvent(listener);
}

/** IPC errors arrive as "Error invoking remote method 'x': Error: message". */
export function errorMessage(err: unknown): string {
  return String((err as Error)?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
