import type { SavedLayout } from './types';

export const serialize = ({ sidebar, sidebarWidth, previewVisible, previewRatio }: SavedLayout) =>
  JSON.stringify({ sidebar, sidebarWidth, previewVisible, previewRatio });
