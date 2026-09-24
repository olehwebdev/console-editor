import { api } from '@/shared/api';

export const navigate = (url: string) => (url.trim() ? api.navigate(url.trim()) : Promise.resolve());
export const reloadPage = () => api.reload();
export const goBack = () => api.goBack();
export const goForward = () => api.goForward();
export const openPageDevTools = () => api.openPageDevTools();
