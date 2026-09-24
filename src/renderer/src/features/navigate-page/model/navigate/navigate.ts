import { api } from '@/shared/api';

export const navigate = (url: string) => (url.trim() ? api.navigate(url.trim()) : Promise.resolve());
