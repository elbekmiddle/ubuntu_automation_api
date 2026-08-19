export interface PublicUser {
    id: string;
    email: string;
    name: string | null;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse {
    user: PublicUser;
    tokens: AuthTokens;
}

export type RegisterResponse = LoginResponse;

export interface RefreshResponse extends AuthTokens {}

export interface ApiErrorBody {
    statusCode: number;
    code?: string;
    message: string | string[];
    error?: string;
}

export interface TemplateAction {
    name: string;
    script: string;
}

export interface Template {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    path: string;
    actions: string[];
    is_public: boolean;
    owner_id: string | null;
    created_at: string;
    updated_at: string;
}

export type JobStatus = 'pending' | 'running' | 'success' | 'failed';

export interface Job {
    id: string;
    template_id: string;
    action: string;
    args: Record<string, unknown>;
    status: JobStatus;
    pid: number | null;
    exit_code: number | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
}

export interface JobLogLine {
    stream: 'stdout' | 'stderr';
    chunk: string;
    created_at: string;
}

export interface JobListResponse {
    data: Job[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export type AppPermission = 'read_only' | 'read_write';

export interface App {
    id: string;
    user_id: string;
    name: string;
    status: 'offline' | 'online';
    permission: AppPermission;
    last_seen_at: string | null;
    hostname: string | null;
    os_platform: string | null;
    os_release: string | null;
    last_metrics: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateAppResponse {
    app: App;
    registrationToken: string;
}
