import { api } from './client.js';
import type { App, CreateAppResponse } from '../types.js';

export async function listApps(): Promise<App[]> {
    const { data } = await api.get<App[]>('/apps');
    return data;
}

export async function createApp(name: string): Promise<CreateAppResponse> {
    const { data } = await api.post<CreateAppResponse>('/apps', { name });
    return data;
}

export async function getApp(id: string): Promise<App> {
    const { data } = await api.get<App>(`/apps/${id}`);
    return data;
}

export async function removeApp(id: string): Promise<void> {
    await api.delete(`/apps/${id}`);
}
