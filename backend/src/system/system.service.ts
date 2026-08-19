import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

import {
    SYSTEM_ERROR_CODES,
    SYSTEM_ERRORS,
} from '../config/errors/system-error-code';

const execAsync = promisify(exec);

@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);

    /**
     * CPU information
     */
    async getCpu() {
        const [load, info] = await Promise.all([
            si.currentLoad(),
            si.cpu(),
        ]);

        return {
            manufacturer: info.manufacturer,
            brand: info.brand,
            cores: info.cores,
            physicalCores: info.physicalCores,
            currentLoad:
                Math.round(load.currentLoad * 100) / 100,
        };
    }

    /**
     * RAM and Swap information
     */
    async getMemory() {
        const mem = await si.mem();

        return {
            ram: {
                total: mem.total,
                used: mem.used,
                free: mem.free,
                available: mem.available,
                usedPercent:
                    Math.round(
                        (mem.used / mem.total) * 10000,
                    ) / 100,
            },

            swap: {
                total: mem.swaptotal,
                used: mem.swapused,
                free: mem.swapfree,
                usedPercent:
                    mem.swaptotal > 0
                        ? Math.round(
                        (mem.swapused /
                            mem.swaptotal) *
                        10000,
                    ) / 100
                        : 0,
            },
        };
    }

    /**
     * Disk / filesystem information
     */
    async getDisk() {
        const fsSize = await si.fsSize();

        return fsSize.map((disk) => ({
            fs: disk.fs,
            mount: disk.mount,
            size: disk.size,
            used: disk.used,
            usePercent: disk.use,
        }));
    }

    /**
     * Network interface statistics
     */
    async getNetwork() {
        const stats = await si.networkStats();

        return stats.map((network) => ({
            iface: network.iface,
            rxBytes: network.rx_bytes,
            txBytes: network.tx_bytes,
            rxSec: network.rx_sec,
            txSec: network.tx_sec,
        }));
    }

    /**
     * Process information
     */
    async getProcesses() {
        const processes = await si.processes();

        const topCpu = [...processes.list]
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 10)
            .map((process) => ({
                pid: process.pid,
                name: process.name,
                cpu: process.cpu,
                memoryPercent: process.mem,
            }));

        const topMemory = [...processes.list]
            .sort((a, b) => b.mem - a.mem)
            .slice(0, 10)
            .map((process) => ({
                pid: process.pid,
                name: process.name,
                cpu: process.cpu,
                memoryPercent: process.mem,
            }));

        return {
            all: processes.all,
            running: processes.running,
            blocked: processes.blocked,
            topCpu,
            topMemory,
        };
    }

    /**
     * Detailed information about a single process
     *
     * Linux:
     * ps -p PID -o ...
     */
    async getProcess(pid: number) {
        if (!Number.isInteger(pid) || pid <= 0) {
            throw new HttpException(
                {
                    code: 'INVALID_PID',
                    message: 'Invalid process ID',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const { stdout } = await execAsync(
                `ps -p ${pid} -o pid=,user=,stat=,etime=,lstart=,comm=,args=`,
            );

            const line = stdout.trim();

            if (!line) {
                throw new HttpException(
                    {
                        code: 'PROCESS_NOT_FOUND',
                        message: `Process ${pid} not found`,
                    },
                    HttpStatus.NOT_FOUND,
                );
            }

            /*
             * Example:
             *
             * 203485 arch1tect Sl+ 01:32:14 Mon Aug 19 14:20:10 2026 node /usr/bin/node ...
             *
             * First 5 fields are predictable.
             */
            const parts = line.split(/\s+/);

            const processPid = Number(parts[0]);
            const user = parts[1];
            const status = parts[2];
            const uptime = parts[3];

            const startedAt = parts
                .slice(4, 9)
                .join(' ');

            const command = parts[9] || null;

            const args =
                parts.slice(10).join(' ') || null;

            return {
                pid: processPid,
                user,
                status,
                uptime,
                startedAt,
                command,
                args,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(
                `Failed to fetch process ${pid}`,
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new HttpException(
                {
                    code: 'PROCESS_FETCH_FAILED',
                    message:
                        `Failed to fetch process ${pid}`,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Docker containers
     */
    async getDocker() {
        try {
            const { stdout } = await execAsync(
                'docker ps --format "{{json .}}"',
            );

            const containers = stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line));

            return {
                installed: true,
                running: true,
                containers,
            };
        } catch (error) {
            this.logger.warn(
                `Docker unavailable: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`,
            );

            return {
                installed: false,
                running: false,
                containers: [],
            };
        }
    }

    /**
     * Operating system information
     */
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

    /**
     * Listening ports
     */
    async getPorts() {
        const connections =
            await si.networkConnections();

        return connections
            .filter(
                (connection) =>
                    connection.state === 'LISTEN',
            )
            .map((connection) => ({
                protocol: connection.protocol,
                address: connection.localAddress,
                port: Number(connection.localPort),
                process:
                    connection.process || null,
                pid:
                    connection.pid || null,
                state: connection.state,
            }))
            .sort(
                (a, b) => a.port - b.port,
            );
    }

    /**
     * System uptime
     */
    async getUptime() {
        const time = await si.time();

        const bootTime =
            time.current -
            time.uptime * 1000;

        return {
            uptime: time.uptime,
            current: time.current,
            bootTime:
                new Date(
                    bootTime,
                ).toISOString(),
        };
    }

    /**
     * Complete system overview
     */
    async getOverview() {
        try {
            const [
                cpu,
                memory,
                disk,
                network,
                processes,
                docker,
                os,
                ports,
                uptime,
            ] = await Promise.all([
                this.getCpu(),
                this.getMemory(),
                this.getDisk(),
                this.getNetwork(),
                this.getProcesses(),
                this.getDocker(),
                this.getOsInfo(),
                this.getPorts(),
                this.getUptime(),
            ]);

            return {
                cpu,
                memory,
                disk,
                network,
                processes,
                docker,
                os,
                ports,
                uptime,
            };
        } catch (error) {
            this.logger.error(
                'Failed to fetch system overview',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new HttpException(
                {
                    code:
                    SYSTEM_ERROR_CODES
                        .FETCH_FAILED,
                    message:
                        SYSTEM_ERRORS[
                            SYSTEM_ERROR_CODES
                                .FETCH_FAILED
                            ],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}