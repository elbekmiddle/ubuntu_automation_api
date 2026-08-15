export interface Job {
    id: string;
    template_id: string;
    action: string;
    args: Record<string, unknown>;
    status: 'pending' | 'running' | 'success' | 'failed';
    pid: number | null;
    exit_code: number | null;
    started_at: Date | null;
    finished_at: Date | null;
    created_at: Date;
}

export interface JobQueuePayload {
    jobId: string;
    templatePath: string;
    action: string;
    args: Record<string, unknown>;
}