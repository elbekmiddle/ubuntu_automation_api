import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Joriy CLI process'ini `agent start --app-id X` bilan alohida, ota-onadan
 * ajratilgan (detached) process sifatida qayta ishga tushiradi. Shu bilan
 * foydalanuvchi terminalni yopsa yoki `screenctl`dan chiqsa ham, agent
 * jarayoni davom etadi — xuddi oddiy background service kabi (lekin
 * systemd'siz, faqat shu login sessiyasi davomida; reboot'dan keyin
 * o'chib qoladi — doimiy bo'lishi uchun auto-start/systemd kerak).
 */
export function spawnDetachedAgent(appId: string): number | undefined {
    const nodeBin = process.execPath;
    const scriptPath = resolve(process.argv[1]);

    const child = spawn(nodeBin, [scriptPath, 'agent', 'start', '--app-id', appId], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
    return child.pid;
}

export function isProcessAlive(pid: number): boolean {
    try {
        // signal 0 — process'ni o'ldirmaydi, faqat mavjudligini tekshiradi
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

export function stopDetachedAgent(pid: number): boolean {
    try {
        process.kill(pid, 'SIGTERM');
        return true;
    } catch {
        return false;
    }
}
