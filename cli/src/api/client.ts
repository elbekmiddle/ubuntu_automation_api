import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { readConfig, readCredentials, writeCredentials, clearCredentials } from '../config/store.js';
import type { ApiErrorBody, RefreshResponse } from '../types.js';
import { ErrorCode, ERROR_CODE_HINTS } from '../utils/error-codes.js';

export class ApiError extends Error {
    readonly statusCode: number;
    readonly code?: string;
    readonly hint?: string;

    constructor(body: ApiErrorBody, statusCode: number) {
        const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = body.code;
        this.hint = body.code ? ERROR_CODE_HINTS[body.code as ErrorCode] : undefined;
    }
}

/** Login/refresh paytida foydalanuvchini cheksiz retry-loop'ga tushirmaslik uchun. */
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

function createClient(): AxiosInstance {
    const { apiUrl } = readConfig();

    const client = axios.create({
        baseURL: apiUrl,
        timeout: 30_000,
        headers: { 'Content-Type': 'application/json' },
    });

    client.interceptors.request.use((config) => {
        const creds = readCredentials();
        if (creds?.accessToken) {
            config.headers.Authorization = `Bearer ${creds.accessToken}`;
        }
        return config;
    });

    client.interceptors.response.use(
        (res) => res,
        async (error: AxiosError<ApiErrorBody>) => {
            const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
            const status = error.response?.status;
            const isAuthRoute = original?.url?.startsWith('/auth/');

            // 401 keldi, hali retry qilinmagan, va bu auth endpointining o'zi emas —
            // demak access token muddati o'tgan bo'lishi mumkin, refresh qilib ko'ramiz.
            if (status === 401 && original && !original._retried && !isAuthRoute) {
                const creds = readCredentials();
                if (!creds?.refreshToken) {
                    clearCredentials();
                    throw toApiError(error);
                }

                original._retried = true;

                if (isRefreshing) {
                    // Boshqa so'rov allaqachon refresh qilyapti — navbatga turamiz.
                    await new Promise<void>((resolve) => pendingQueue.push(resolve));
                    return client(original);
                }

                isRefreshing = true;
                try {
                    const { data } = await axios.post<RefreshResponse>(`${apiUrl}/auth/refresh`, {
                        refreshToken: creds.refreshToken,
                    });
                    writeCredentials({ ...creds, accessToken: data.accessToken, refreshToken: data.refreshToken });
                    pendingQueue.forEach((resolve) => resolve());
                    pendingQueue = [];
                    return client(original);
                } catch (refreshError) {
                    clearCredentials();
                    pendingQueue = [];
                    throw toApiError(error);
                } finally {
                    isRefreshing = false;
                }
            }

            throw toApiError(error);
        },
    );

    return client;
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
    if (error.response?.data) {
        return new ApiError(error.response.data, error.response.status);
    }
    return new ApiError(
        { statusCode: 0, message: error.message || 'Network error — server bilan bog\'lanib bo\'lmadi' },
        0,
    );
}

export const api = createClient();
