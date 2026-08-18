import { io, type Socket } from 'socket.io-client';
import chalk from 'chalk';
import { getStaticSystemInfo, collectHeartbeatMetrics } from './collect.js';

export interface AgentRunOptions {
    apiUrl: string;
    appId: string;
    registrationToken: string;
    /** ms — backend STALE_AFTER_MS (60s) dan kichik bo'lishi kerak. */
    heartbeatIntervalMs?: number;
    onLog?: (line: string) => void;
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

    async function stop(): Promise<void> {
        stopHeartbeat();
        socket.disconnect();
    }

    return { stop };
}
