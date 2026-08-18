import { api } from './client.js';
export async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
}
export async function register(email, password, name) {
    const { data } = await api.post('/auth/register', { email, password, name });
    return data;
}
export async function logout(refreshToken) {
    await api.post('/auth/logout', { refreshToken });
}
export async function me() {
    const { data } = await api.get('/auth/me');
    return data;
}
