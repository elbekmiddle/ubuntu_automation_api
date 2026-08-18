import { api } from './client.js';
import type { Job, JobListResponse, JobLogLine } from '../types.js';

export async function createJob(templateSlug: string, action: string, args: Record<string, unknown> = {}): Promise<Job> {
    const { data } = await api.post<Job>('/jobs', { templateSlug, action, args });
    return data;
}

export async function getJob(id: string): Promise<Job> {
    const { data } = await api.get<Job>(`/jobs/${id}`);
    return data;
}

export async function getJobLogs(id: string): Promise<JobLogLine[]> {
    const { data } = await api.get<JobLogLine[]>(`/jobs/${id}/logs`);
    return data;
}

export async function listJobs(page = 1, limit = 10): Promise<JobListResponse> {
    const { data } = await api.get<JobListResponse>('/jobs', { params: { page, limit } });
    return data;
}

/** Job tugaguncha (success/failed) kutadi, poll qilib turadi. */
export async function waitForJob(id: string, onLog?: (line: JobLogLine) => void, intervalMs = 700): Promise<Job> {
    let seenLogCount = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const [job, logs] = await Promise.all([getJob(id), getJobLogs(id)]);

        if (onLog) {
            for (const line of logs.slice(seenLogCount)) onLog(line);
            seenLogCount = logs.length;
        }

        if (job.status === 'success' || job.status === 'failed') {
            return job;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}
