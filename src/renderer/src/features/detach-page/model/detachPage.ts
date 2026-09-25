import { api } from '@/shared/api';

/** Moves the website to a window of its own (to put on another screen), or brings that window forward. */
export const detachPage = () => api.detachPage();
