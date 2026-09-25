import { api } from '@/shared/api';

/** Keeps the Actions window above the other windows (the page's, the editor's), or not. */
export const setActionsOnTop = (onTop: boolean) => api.setActionsOnTop(onTop);
