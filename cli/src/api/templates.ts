import { api } from './client.js';
import type { Template } from '../types.js';

export async function listTemplates(): Promise<Template[]> {
    const { data } = await api.get<Template[]>('/templates');
    return data;
}

export async function listPublicTemplates(search?: string): Promise<Template[]> {
    const { data } = await api.get<Template[]>('/templates/public', { params: { q: search } });
    return data;
}

export async function getTemplate(slugOrId: string): Promise<Template> {
    const { data } = await api.get<Template>(`/templates/${slugOrId}`);
    return data;
}
