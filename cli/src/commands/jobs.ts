import chalk from 'chalk';
import { listJobs } from '../api/jobs.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
import type { Job } from '../types.js';

function statusIcon(job: Job): string {
    if (job.status === 'success') return chalk.green('✓');
    if (job.status === 'failed') return chalk.red('✕');
    if (job.status === 'running') return chalk.cyan('●');
    return chalk.dim('○');
}

function timeAgo(iso: string | null): string {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

export async function jobsListCommand(): Promise<void> {
    if (!isLoggedIn()) return requireLogin();

    try {
        const { data: jobs, total } = await listJobs(1, 10);
        console.log(chalk.bold(`\nRecent Jobs (${total})\n`));
        if (jobs.length === 0) {
            console.log(chalk.dim('Hali job yo\'q.'));
            return;
        }
        for (const job of jobs) {
            console.log(`${statusIcon(job)} ${job.action}`);
            console.log(chalk.dim(`  ${job.status}${job.status === 'running' ? '...' : ''} · ${timeAgo(job.created_at)}`));
        }
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
