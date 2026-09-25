import type { SavedLayout } from './types';

export const serialize = ({ sidebar, sidebarWidth, previewVisible, previewRatio, consoleVisible, consoleHeight, bottomView }: SavedLayout) =>
  JSON.stringify({ sidebar, sidebarWidth, previewVisible, previewRatio, consoleVisible, consoleHeight, bottomView });
