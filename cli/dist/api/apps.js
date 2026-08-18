import { api } from './client.js';
export async function listApps() {
    const { data } = await api.get('/apps');
    return data;
}
export async function createApp(name) {
    const { data } = await api.post('/apps', { name });
    return data;
}
export async function getApp(id) {
    const { data } = await api.get(`/apps/${id}`);
    return data;
}
export async function removeApp(id) {
    await api.delete(`/apps/${id}`);
}
