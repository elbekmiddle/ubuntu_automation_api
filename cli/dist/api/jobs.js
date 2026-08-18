import { api } from './client.js';
export async function createJob(templateSlug, action, args = {}) {
    const { data } = await api.post('/jobs', { templateSlug, action, args });
    return data;
}
export async function getJob(id) {
    const { data } = await api.get(`/jobs/${id}`);
    return data;
}
export async function getJobLogs(id) {
    const { data } = await api.get(`/jobs/${id}/logs`);
    return data;
}
export async function listJobs(page = 1, limit = 10) {
    const { data } = await api.get('/jobs', { params: { page, limit } });
    return data;
}
/** Job tugaguncha (success/failed) kutadi, poll qilib turadi. */
export async function waitForJob(id, onLog, intervalMs = 700) {
    let seenLogCount = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const [job, logs] = await Promise.all([getJob(id), getJobLogs(id)]);
        if (onLog) {
            for (const line of logs.slice(seenLogCount))
                onLog(line);
            seenLogCount = logs.length;
        }
        if (job.status === 'success' || job.status === 'failed') {
            return job;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}
