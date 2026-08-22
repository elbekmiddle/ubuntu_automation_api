import { api } from './client.js';
import type { App, AppPermission, CreateAppResponse } from '../types.js';

export async function listApps(): Promise<App[]> {
    const { data } = await api.get<App[]>('/apps');
    return data;
}

export async function createApp(name: string, permission: AppPermission = 'read_write', machineId?: string): Promise<CreateAppResponse> {
    const { data } = await api.post<CreateAppResponse>('/apps', { name, permission, machineId });
    return data;
}

export async function getApp(id: string): Promise<App> {
    const { data } = await api.get<App>(`/apps/${id}`);
    return data;
}

export async function removeApp(id: string): Promise<void> {
    await api.delete(`/apps/${id}`);
}
