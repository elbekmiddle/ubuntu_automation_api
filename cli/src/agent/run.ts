import { io, type Socket } from 'socket.io-client';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStaticSystemInfo, collectHeartbeatMetrics } from './collect.js';

export interface AgentRunOptions {
    apiUrl: string;
    appId: string;
    registrationToken: string;
    /** ms — backend STALE_AFTER_MS (60s) dan kichik bo'lishi kerak. */
    heartbeatIntervalMs?: number;
    onLog?: (line: string) => void;
}

interface JobRunPayload {
    jobId: string;
    action: string;
    script: string;
    args: Record<string, unknown>;
}

const SCRIPT_TIMEOUT_MS = Number(process.env.SCREENCTL_SCRIPT_TIMEOUT_MS ?? 5 * 60 * 1000);

/**
 * Backenddan kelgan 'job:run' hodisasini bajaradi — script'ni vaqtinchalik
 * faylga yozib, `bash` orqali ishga tushiradi, stdout/stderr'ni bo'lib-bo'lib
 * 'job:log' orqali qaytaradi, tugagach 'job:complete' yuboradi.
 */
async function executeJob(socket: Socket, payload: JobRunPayload, log: (line: string) => void): Promise<void> {
    const { jobId, action } = payload;
    log(chalk.dim(`→ Running job ${jobId} (${action})...`));

    let tempDir: string | null = null;
    try {
        tempDir = await mkdtemp(join(tmpdir(), 'screenctl-job-'));
        const scriptPath = join(tempDir, `${action}.sh`);
        await writeFile(scriptPath, payload.script, { mode: 0o700 });

        // Backend'dagi JobsProcessor bilan bir xil falsafa: minimal env,
        // lekin DISPLAY/XAUTHORITY kabi X11/Wayland uchun kerakli
        // o'zgaruvchilar saqlanadi (bo'lmasa xrandr kabi scriptlar
        // "Can't open display" bilan yiqiladi).
        const safeEnv: NodeJS.ProcessEnv = {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            LANG: process.env.LANG ?? 'C.UTF-8',
            DISPLAY: process.env.DISPLAY,
            XAUTHORITY: process.env.XAUTHORITY,
            XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
            DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
        };

        const exitCode: number | null = await new Promise((resolve) => {
            const child = spawn('bash', [scriptPath], {
                env: safeEnv,
                timeout: SCRIPT_TIMEOUT_MS,
                killSignal: 'SIGKILL',
            });

            child.stdout.on('data', (data: Buffer) => {
                socket.emit('job:log', { jobId, stream: 'stdout', chunk: data.toString() });
            });
            child.stderr.on('data', (data: Buffer) => {
                socket.emit('job:log', { jobId, stream: 'stderr', chunk: data.toString() });
            });
            child.on('close', (code) => resolve(code));
            child.on('error', (err) => {
                socket.emit('job:log', { jobId, stream: 'stderr', chunk: `Agent execution error: ${err.message}\n` });
                resolve(null);
            });
        });

        socket.emit('job:complete', { jobId, exitCode });
        log(
            exitCode === 0
                ? chalk.green(`✓ Job ${jobId} completed`)
                : chalk.red(`✕ Job ${jobId} failed (exit ${exitCode ?? '?'})`),
        );
    } catch (err) {
        socket.emit('job:log', {
            jobId,
            stream: 'stderr',
            chunk: `Agent failed to prepare job: ${err instanceof Error ? err.message : String(err)}\n`,
        });
        socket.emit('job:complete', { jobId, exitCode: null });
    } finally {
        if (tempDir) await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

/**
 * Agentni ishga tushiradi va promise hech qachon o'zi resolve bo'lmaydi —
 * process SIGINT/SIGTERM bilan to'xtatilguncha ishlab turadi (systemd
 * `Restart=always` bilan ham mos: process kill qilinsa, service qayta
 * ko'tariladi).
 */
export function runAgent(opts: AgentRunOptions): { stop: () => Promise<void> } {
    const log = opts.onLog ?? ((line: string) => console.log(line));
    const heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 20_000;

    const socket: Socket = io(`${opts.apiUrl}/agents`, {
        reconnection: true,
        reconnectionDelay: 2_000,
        reconnectionDelayMax: 15_000,
        transports: ['websocket', 'polling'],
    });

    let heartbeatTimer: NodeJS.Timeout | null = null;

    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    async function sendHeartbeat() {
        try {
            const metrics = await collectHeartbeatMetrics();
            socket.emit('heartbeat', metrics);
        } catch (err) {
            log(chalk.dim(`  (heartbeat skipped: ${err instanceof Error ? err.message : String(err)})`));
        }
    }

    function register() {
        const sysInfo = getStaticSystemInfo();
        socket.emit(
            'register',
            {
                appId: opts.appId,
                registrationToken: opts.registrationToken,
                hostname: sysInfo.hostname,
                osPlatform: sysInfo.osPlatform,
                osRelease: sysInfo.osRelease,
            },
            (ack?: { event: string; data: Record<string, unknown> }) => {
                if (ack?.event === 'registered') {
                    log(chalk.green(`✓ Registered — device is now online (${sysInfo.hostname})`));
                } else if (ack?.event === 'error') {
                    log(chalk.red(`✕ Registration failed: ${ack.data?.message ?? 'unknown error'}`));
                }
            },
        );
    }

    socket.on('connect', () => {
        log(chalk.dim(`Connected to ${opts.apiUrl} — registering...`));
        register();
        stopHeartbeat();
        void sendHeartbeat();
        heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
    });

    socket.on('disconnect', (reason) => {
        stopHeartbeat();
        log(chalk.yellow(`○ Disconnected (${reason}) — will retry...`));
    });

    socket.on('connect_error', (err) => {
        log(chalk.red(`✕ Connection error: ${err.message}`));
    });

    socket.on('job:run', (payload: JobRunPayload) => {
        void executeJob(socket, payload, log);
    });

    async function stop(): Promise<void> {
        stopHeartbeat();
        socket.disconnect();
    }

    return { stop };
}
