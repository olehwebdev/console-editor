import { api } from '@/shared/api';

/** Moves the Actions panel into a window of its own (to put beside the page, or on another screen), or brings that window forward. */
export const detachActions = () => api.detachActions();
