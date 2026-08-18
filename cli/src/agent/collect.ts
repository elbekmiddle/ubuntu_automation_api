import * as os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface StaticSystemInfo {
    hostname: string;
    osPlatform: string;
    osRelease: string;
    arch: string;
    cpuModel: string;
    cores: number;
}

export function getStaticSystemInfo(): StaticSystemInfo {
    const cpus = os.cpus();
    return {
        hostname: os.hostname(),
        osPlatform: os.platform(),
        osRelease: os.release(),
        arch: os.arch(),
        cpuModel: cpus[0]?.model ?? 'unknown',
        cores: cpus.length,
    };
}

/** `os.cpus()`ning ikki lahzasi orasidagi farqdan umumiy CPU yuklamasini (%) hisoblaydi. */
function cpuPercentBetween(a: os.CpuInfo[], b: os.CpuInfo[]): number {
    let idleDelta = 0;
    let totalDelta = 0;

    for (let i = 0; i < a.length; i++) {
        const aTimes = a[i].times;
        const bTimes = b[i].times;
        const aTotal = aTimes.user + aTimes.nice + aTimes.sys + aTimes.idle + aTimes.irq;
        const bTotal = bTimes.user + bTimes.nice + bTimes.sys + bTimes.idle + bTimes.irq;
        totalDelta += bTotal - aTotal;
        idleDelta += bTimes.idle - aTimes.idle;
    }

    if (totalDelta <= 0) return 0;
    return Math.round((1 - idleDelta / totalDelta) * 10000) / 100;
}

async function getCpuPercent(sampleMs = 300): Promise<number> {
    const before = os.cpus();
    await new Promise((resolve) => setTimeout(resolve, sampleMs));
    const after = os.cpus();
    return cpuPercentBetween(before, after);
}

function getMemory() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
        total,
        used,
        free,
        usedPercent: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
    };
}

/** Linux/macOS'da `df` orqali root fayl tizimi hajmini oladi; topilmasa xatoni yutadi. */
async function getDisk(): Promise<{ total: number; used: number; usedPercent: number } | null> {
    try {
        const { stdout } = await execAsync('df -k / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        // Filesystem, 1K-blocks, Used, Available, Use%, Mounted
        const totalKb = Number(parts[1]);
        const usedKb = Number(parts[2]);
        const usePercent = Number(String(parts[4]).replace('%', ''));
        if (!Number.isFinite(totalKb) || !Number.isFinite(usedKb)) return null;
        return {
            total: totalKb * 1024,
            used: usedKb * 1024,
            usedPercent: Number.isFinite(usePercent) ? usePercent : Math.round((usedKb / totalKb) * 10000) / 100,
        };
    } catch {
        return null;
    }
}

export interface HeartbeatMetrics {
    cpu: number;
    memory: ReturnType<typeof getMemory>;
    disk: { total: number; used: number; usedPercent: number } | null;
    loadavg: number[];
    uptime: number;
    [key: string]: unknown;
}

export async function collectHeartbeatMetrics(): Promise<HeartbeatMetrics> {
    const [cpu, disk] = await Promise.all([getCpuPercent(), getDisk()]);
    return {
        cpu,
        memory: getMemory(),
        disk,
        loadavg: os.loadavg(),
        uptime: os.uptime(),
    };
}
