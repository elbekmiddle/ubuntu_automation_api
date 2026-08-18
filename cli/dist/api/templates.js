import { api } from './client.js';
export async function listTemplates() {
    const { data } = await api.get('/templates');
    return data;
}
export async function listPublicTemplates(search) {
    const { data } = await api.get('/templates/public', { params: { q: search } });
    return data;
}
export async function getTemplate(slugOrId) {
    const { data } = await api.get(`/templates/${slugOrId}`);
    return data;
}
