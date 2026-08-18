import { api } from './client.js';
import type { LoginResponse, RegisterResponse, PublicUser } from '../types.js';

export async function login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
}

export async function register(email: string, password: string, name?: string): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', { email, password, name });
    return data;
}

export async function logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
}

export async function me(): Promise<PublicUser> {
    const { data } = await api.get<PublicUser>('/auth/me');
    return data;
}
