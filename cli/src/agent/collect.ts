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

export interface PortInfo {
    proto: 'tcp' | 'udp';
    port: number;
    address: string;
    process: string | null;
    pid: number | null;
}

/**
 * `ss -tulnp` chiqishini parslaydi. Process nomi/PID faqat shu agent qaysi
 * user nomidan ishga tushirilgan bo'lsa o'sha userga tegishli socketlar
 * uchun ko'rinadi (root emas — kernel shunday cheklaydi); qolganlari uchun
 * process/pid `null` qaytadi, lekin port/protokol baribir ko'rinadi.
 */
function parseSsOutput(stdout: string): PortInfo[] {
    const lines = stdout.trim().split('\n').slice(1); // header qatorini tashlab yuboramiz
    const byKey = new Map<string, PortInfo>();

    for (const line of lines) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 5) continue;

        const proto: 'tcp' | 'udp' = cols[0].toLowerCase().startsWith('udp') ? 'udp' : 'tcp';
        const localAddr = cols[4];
        const lastColon = localAddr.lastIndexOf(':');
        if (lastColon === -1) continue;

        const address = localAddr.slice(0, lastColon).replace(/^\[|\]$/g, '');
        const port = Number(localAddr.slice(lastColon + 1));
        if (!Number.isFinite(port)) continue;

        let processName: string | null = null;
        let pid: number | null = null;
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
function parseNetstatOutput(stdout: string): PortInfo[] {
    const byKey = new Map<string, PortInfo>();

    for (const line of stdout.split('\n')) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 4 || !/^(tcp|udp)/i.test(cols[0])) continue;

        const proto: 'tcp' | 'udp' = cols[0].toLowerCase().startsWith('udp') ? 'udp' : 'tcp';
        const localAddr = cols[3];
        const lastColon = localAddr.lastIndexOf(':');
        if (lastColon === -1) continue;

        const address = localAddr.slice(0, lastColon).replace(/^\[|\]$/g, '');
        const port = Number(localAddr.slice(lastColon + 1));
        if (!Number.isFinite(port)) continue;

        const pidProgram = cols[cols.length - 1];
        let processName: string | null = null;
        let pid: number | null = null;
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

let portsCache: PortInfo[] | null = null;
let heartbeatCounter = 0;

/** `ss` ko'pchilik Linux distributivlarida bor; bo'lmasa `netstat`ga tushamiz. */
async function collectPortsNow(): Promise<PortInfo[] | null> {
    try {
        const { stdout } = await execAsync('ss -tulnp 2>/dev/null');
        return parseSsOutput(stdout);
    } catch {
        try {
            const { stdout } = await execAsync('netstat -tulnp 2>/dev/null');
            return parseNetstatOutput(stdout);
        } catch {
            return null;
        }
    }
}

/** Linux'da `free -b` orqali swap holatini oladi; boshqa platformalarda yoki topilmasa `null`. */
async function getSwap(): Promise<{ total: number; used: number; usedPercent: number } | null> {
    if (process.platform !== 'linux') return null;
    try {
        // `LC_ALL=C` — tizim locale'i inglizcha bo'lmasa ham "Swap:" qatori
        // boshqa tilda ("Auslagerung:", "Обмен:" va h.k.) chiqib ketmasin.
        const { stdout } = await execAsync('LC_ALL=C free -b');
        const line = stdout.split('\n').find((l) => l.toLowerCase().startsWith('swap'));
        if (!line) return null;
        const parts = line.trim().split(/\s+/);
        // Swap:  total  used  free
        const total = Number(parts[1]);
        const used = Number(parts[2]);
        if (!Number.isFinite(total) || !Number.isFinite(used)) return null;
        if (total <= 0) return { total: 0, used: 0, usedPercent: 0 };
        return {
            total,
            used,
            usedPercent: Math.round((used / total) * 10000) / 100,
        };
    } catch {
        return null;
    }
}

export interface NetworkInterfaceInfo {
    name: string;
    address: string;
    family: 'IPv4' | 'IPv6';
    mac: string;
    internal: boolean;
    cidr: string | null;
}

/**
 * `os.networkInterfaces()` — Node'ning o'zida bor, shell chaqirish shart
 * emas, shuning uchun Linux/Windows/macOS'da bir xil ishlaydi (kelajakdagi
 * Windows/macOS agent uchun ham qayta yozish kerak bo'lmaydi). Loopback
 * (`internal: true`) interfeyslar ham qaytariladi — frontend ularni xohlasa
 * filtrlab ko'rsatadi, chunki ba'zan diagnostika uchun foydali (masalan
 * `lo` orqali local xizmat javob berayaptimi tekshirish).
 */
function getNetwork(): NetworkInterfaceInfo[] {
    const ifaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
        for (const addr of addrs ?? []) {
            result.push({
                name,
                address: addr.address,
                family: addr.family as 'IPv4' | 'IPv6',
                mac: addr.mac,
                internal: addr.internal,
                cidr: addr.cidr ?? null,
            });
        }
    }
    return result;
}

export interface DockerStatus {
    /** `docker` CLI mashinada topildimi (daemon holatidan qat'i nazar). */
    installed: boolean;
    /** Daemon'ga ulanib bo'ldimi (`docker ps` muvaffaqiyatli ishladimi). */
    engineRunning: boolean;
    running: boolean;
    version: string | null;
    containers: Array<{ ID: string; Names: string; State: string; Ports: string }>;
}

/**
 * Docker holatini tekshiradi.
 *
 * MUHIM: "o'rnatilganmi" va "daemon'ga ulanib bo'ladimi" — ikki alohida
 * savol, ilgari bittasiga birlashtirilgan edi (`docker version --format
 * "{{.Server.Version}}"` — bu Server bo'limini talab qiladi, ya'ni
 * daemon'ga yetib bormasa butun tekshiruv "o'rnatilmagan" deb noto'g'ri
 * xulosa chiqarardi, garchi docker aslida o'rnatilgan va hatto ishlab
 * turgan bo'lsa ham — masalan agent systemd service sifatida boshqa user/
 * env ostida ishga tushirilgan bo'lsa va shu user docker socket'ga
 * yetolmasa). Endi ikkalasi mustaqil tekshiriladi:
 *   1) `docker --version` — faqat CLI borligini tekshiradi, daemon shart emas.
 *   2) `docker ps` — daemon'ga ulanishni tekshiradi; muvaffaqiyatsiz bo'lsa
 *      ham (1) haqiqiy bo'lsa `installed:true, engineRunning:false` qaytadi.
 * Rootless Docker holatlarida socket odatda `$XDG_RUNTIME_DIR/docker.sock`da
 * bo'ladi — agent systemd (system) service sifatida ishga tushirilgan bo'lsa
 * bu o'zgaruvchi yo'q bo'lishi mumkin, shuning uchun standart
 * `/run/user/<uid>` yo'lini fallback sifatida qo'shib ko'ramiz.
 */
async function getDocker(): Promise<DockerStatus> {
    const empty: DockerStatus = { installed: false, engineRunning: false, running: false, version: null, containers: [] };

    let version: string | null = null;
    try {
        const { stdout } = await execAsync('docker --version');
        version = stdout.trim() || null;
    } catch {
        // `docker` topilmadi (ENOENT) yoki umuman ishlamadi — CLI o'zi yo'q.
        return empty;
    }

    const rootlessEnvFallback = {
        ...process.env,
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? ''}`,
    };

    async function tryPs(env: NodeJS.ProcessEnv) {
        const { stdout } = await execAsync(
            `docker ps --format "{{.ID}}|{{.Names}}|{{.State}}|{{.Ports}}"`,
            { env },
        );
        return stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                const [ID, Names, State, Ports] = line.split('|');
                return { ID, Names, State: State ?? 'running', Ports: Ports ?? '' };
            });
    }

    try {
        const containers = await tryPs(process.env);
        return { installed: true, engineRunning: true, running: containers.length > 0, version, containers };
    } catch {
        try {
            const containers = await tryPs(rootlessEnvFallback);
            return { installed: true, engineRunning: true, running: containers.length > 0, version, containers };
        } catch {
            // CLI bor (version o'qildi), lekin daemon'ga ulanib bo'lmadi —
            // masalan dockerd ishlamayapti yoki bu user docker guruhida emas.
            return { installed: true, engineRunning: false, running: false, version, containers: [] };
        }
    }
}

export interface ProcessInfo {
    pid: number;
    cpu: number;
    mem: number;
    command: string;
}

let processesCache: ProcessInfo[] | null = null;

/**
 * Eng ko'p CPU yeyotgan 15 ta process — to'liq ro'yxat emas (minglab
 * process bo'lishi mumkin, heartbeat payload'i shishib ketadi), diagnostika
 * uchun odatda eng "og'ir" processlar muhim.
 */
async function collectProcessesNow(): Promise<ProcessInfo[] | null> {
    try {
        const { stdout } = await execAsync(
            'ps -eo pid,pcpu,pmem,comm --sort=-pcpu --no-headers | head -n 15',
        );
        const list = stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                const parts = line.trim().split(/\s+/);
                const pid = Number(parts[0]);
                const cpu = Number(parts[1]);
                const mem = Number(parts[2]);
                const command = parts.slice(3).join(' ');
                return { pid, cpu, mem, command };
            })
            .filter((p) => Number.isFinite(p.pid) && p.command.length > 0);
        return list.length > 0 ? list : null;
    } catch {
        return null;
    }
}

export interface ServiceInfo {
    name: string;
    status: string;
}

let servicesCache: ServiceInfo[] | null = null;

/**
 * systemd unit'lari — faqat hozir ishlab turganlari (`state=running`).
 * To'liq ro'yxat (o'chirilgan/faol bo'lmagan unit'lar bilan) juda uzun va
 * kamdan-kam foydali, shuning uchun bu yerga qo'shilmagan. `systemctl`
 * topilmasa (systemd'siz konteyner, yoki hali qo'llab-quvvatlanmagan
 * platforma) `null` qaytadi — frontend buni "not available" deb ko'rsatadi.
 */
async function collectServicesNow(): Promise<ServiceInfo[] | null> {
    if (process.platform !== 'linux') return null;
    try {
        const { stdout } = await execAsync(
            'systemctl list-units --type=service --state=running --no-legend --no-pager --plain 2>/dev/null',
        );
        const list = stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                // UNIT LOAD ACTIVE SUB DESCRIPTION...
                const parts = line.trim().split(/\s+/);
                const name = (parts[0] ?? '').replace(/\.service$/, '');
                const status = parts[3] ?? 'running';
                return { name, status };
            })
            .filter((s) => s.name.length > 0);
        return list;
    } catch {
        return null;
    }
}

export interface HeartbeatMetrics {
    cpu: number;
    cores: number;
    arch: string;
    memory: ReturnType<typeof getMemory>;
    swap: { total: number; used: number; usedPercent: number } | null;
    disk: { total: number; used: number; usedPercent: number } | null;
    docker: DockerStatus;
    network: NetworkInterfaceInfo[];
    loadavg: number[];
    uptime: number;
    ports: PortInfo[] | null;
    processes: ProcessInfo[] | null;
    services: ServiceInfo[] | null;
    [key: string]: unknown;
}

export async function collectHeartbeatMetrics(): Promise<HeartbeatMetrics> {
    const [cpu, disk, swap, docker] = await Promise.all([
        getCpuPercent(),
        getDisk(),
        getSwap(),
        getDocker(),
    ]);

    // Portlar/processlar/servicelarni har bir heartbeatda emas, har
    // ~3-heartbeatda (taxminan 60s) yangilaymiz — bularning barchasi
    // shell chaqirishga tayanadi va CPU'ga og'irroq, tez-tez shart emas.
    heartbeatCounter++;
    if (portsCache === null || heartbeatCounter % 3 === 1) {
        const [ports, processes, services] = await Promise.all([
            collectPortsNow(),
            collectProcessesNow(),
            collectServicesNow(),
        ]);
        portsCache = ports;
        processesCache = processes;
        servicesCache = services;
    }

    return {
        cpu,
        cores: os.cpus().length,
        arch: os.arch(),
        memory: getMemory(),
        swap,
        disk,
        docker,
        network: getNetwork(),
        loadavg: os.loadavg(),
        uptime: os.uptime(),
        ports: portsCache,
        processes: processesCache,
        services: servicesCache,
    };
}
