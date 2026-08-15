import { Injectable } from '@nestjs/common';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SystemService {
    async getCpu() {
        const [load, info] = await Promise.all([si.currentLoad(), si.cpu()]);
        return {
            manufacturer: info.manufacturer,
            brand: info.brand,
            cores: info.cores,
            physicalCores: info.physicalCores,
            currentLoad: Math.round(load.currentLoad * 100) / 100,
        };
    }

    async getMemory() {
        const mem = await si.mem();
        return {
            total: mem.total,
            used: mem.used,
            free: mem.free,
            available: mem.available,
            usedPercent: Math.round((mem.used / mem.total) * 10000) / 100,
        };
    }

    async getDisk() {
        const fsSize = await si.fsSize();
        return fsSize.map((d) => ({
            fs: d.fs,
            mount: d.mount,
            size: d.size,
            used: d.used,
            usePercent: d.use,
        }));
    }

    async getNetwork() {
        const stats = await si.networkStats();
        return stats.map((n) => ({
            iface: n.iface,
            rxBytes: n.rx_bytes,
            txBytes: n.tx_bytes,
            rxSec: n.rx_sec,
            txSec: n.tx_sec,
        }));
    }

    async getProcesses() {
        const procs = await si.processes();
        return {
            all: procs.all,
            running: procs.running,
            blocked: procs.blocked,
            top: procs.list
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 10)
                .map((p) => ({ pid: p.pid, name: p.name, cpu: p.cpu, mem: p.mem })),
        };
    }

    async getDocker() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{json .}}"');
            const containers = stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line));
            return { installed: true, running: true, containers };
        } catch {
            return { installed: false, running: false, containers: [] };
        }
    }

    async getOsInfo() {
        const osInfo = await si.osInfo();
        return {
            platform: osInfo.platform,
            distro: osInfo.distro,
            release: osInfo.release,
            kernel: osInfo.kernel,
            arch: osInfo.arch,
        };
    }

    async getOverview() {
        const [cpu, memory, disk, os, docker] = await Promise.all([
            this.getCpu(),
            this.getMemory(),
            this.getDisk(),
            this.getOsInfo(),
            this.getDocker(),
        ]);
        return { cpu, memory, disk, os, docker };
    }
}