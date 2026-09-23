/// <reference types="vite/client" />
import type { ConsoleEditorApi } from '../../shared/types';

declare global {
  interface Window {
    consoleEditor: ConsoleEditorApi;
  }
}
