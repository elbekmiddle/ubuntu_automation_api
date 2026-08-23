import * as os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
export function getStaticSystemInfo() {
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
function cpuPercentBetween(a, b) {
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
    if (totalDelta <= 0)
        return 0;
    return Math.round((1 - idleDelta / totalDelta) * 10000) / 100;
}
async function getCpuPercent(sampleMs = 300) {
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
async function getDisk() {
    try {
        const { stdout } = await execAsync('df -k / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        // Filesystem, 1K-blocks, Used, Available, Use%, Mounted
        const totalKb = Number(parts[1]);
        const usedKb = Number(parts[2]);
        const usePercent = Number(String(parts[4]).replace('%', ''));
        if (!Number.isFinite(totalKb) || !Number.isFinite(usedKb))
            return null;
        return {
            total: totalKb * 1024,
            used: usedKb * 1024,
            usedPercent: Number.isFinite(usePercent) ? usePercent : Math.round((usedKb / totalKb) * 10000) / 100,
        };
    }
    catch {
        return null;
    }
}
/**
 * `ss -tulnp` chiqishini parslaydi. Process nomi/PID faqat shu agent qaysi
 * user nomidan ishga tushirilgan bo'lsa o'sha userga tegishli socketlar
 * uchun ko'rinadi (root emas — kernel shunday cheklaydi); qolganlari uchun
 * process/pid `null` qaytadi, lekin port/protokol baribir ko'rinadi.
 */
function parseSsOutput(stdout) {
    const lines = stdout.trim().split('\n').slice(1); // header qatorini tashlab yuboramiz
    const byKey = new Map();
    for (const line of lines) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 5)
            continue;
        const proto = cols[0].toLowerCase().startsWith('udp') ? 'udp' : 'tcp';
        const localAddr = cols[4];
        const lastColon = localAddr.lastIndexOf(':');
        if (lastColon === -1)
            continue;
        const address = localAddr.slice(0, lastColon).replace(/^\[|\]$/g, '');
        const port = Number(localAddr.slice(lastColon + 1));
        if (!Number.isFinite(port))
            continue;
        let processName = null;
        let pid = null;
        const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
        if (procMatch) {
            processName = procMatch[1];
            pid = Number(procMatch[2]);
        }
        // Bir xil port bir nechta interfeysda (0.0.0.0, ::, 127.0.0.1) ko'rinishi
        // mumkin — bittasiga birlashtiramiz, lekin process ma'lumoti bo'lgan
        // yozuvni ustun qo'yamiz.
        const key = `${proto}:${port}`;
        const existing = byKey.get(key);
        if (!existing || (!existing.process && processName)) {
            byKey.set(key, { proto, port, address, process: processName, pid });
        }
    }
    return [...byKey.values()].sort((a, b) => a.port - b.port);
}
/** `netstat -tulnp` chiqishini parslaydi (fallback, `ss` topilmasa). */
function parseNetstatOutput(stdout) {
    const byKey = new Map();
    for (const line of stdout.split('\n')) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 4 || !/^(tcp|udp)/i.test(cols[0]))
            continue;
        const proto = cols[0].toLowerCase().startsWith('udp') ? 'udp' : 'tcp';
        const localAddr = cols[3];
        const lastColon = localAddr.lastIndexOf(':');
        if (lastColon === -1)
            continue;
        const address = localAddr.slice(0, lastColon).replace(/^\[|\]$/g, '');
        const port = Number(localAddr.slice(lastColon + 1));
        if (!Number.isFinite(port))
            continue;
        const pidProgram = cols[cols.length - 1];
        let processName = null;
        let pid = null;
        const match = pidProgram.match(/^(\d+)\/(.+)$/);
        if (match) {
            pid = Number(match[1]);
            processName = match[2];
        }
        const key = `${proto}:${port}`;
        const existing = byKey.get(key);
        if (!existing || (!existing.process && processName)) {
            byKey.set(key, { proto, port, address, process: processName, pid });
        }
    }
    return [...byKey.values()].sort((a, b) => a.port - b.port);
}
let portsCache = null;
let heartbeatCounter = 0;
/** `ss` ko'pchilik Linux distributivlarida bor; bo'lmasa `netstat`ga tushamiz. */
async function collectPortsNow() {
    try {
        const { stdout } = await execAsync('ss -tulnp 2>/dev/null');
        return parseSsOutput(stdout);
    }
    catch {
        try {
            const { stdout } = await execAsync('netstat -tulnp 2>/dev/null');
            return parseNetstatOutput(stdout);
        }
        catch {
            return null;
        }
    }
}
export async function collectHeartbeatMetrics() {
    const [cpu, disk] = await Promise.all([getCpuPercent(), getDisk()]);
    // Portlarni har bir heartbeatda emas, har ~3-heartbeatda (taxminan 60s)
    // yangilaymiz — `ss` chaqirish CPU'ga og'irroq, tez-tez shart emas.
    heartbeatCounter++;
    if (portsCache === null || heartbeatCounter % 3 === 1) {
        portsCache = await collectPortsNow();
    }
    return {
        cpu,
        memory: getMemory(),
        disk,
        loadavg: os.loadavg(),
        uptime: os.uptime(),
        ports: portsCache,
    };
}
