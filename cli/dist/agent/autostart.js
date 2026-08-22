import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
function unitNameFor(appId) {
    return `screenctl-agent-${appId.slice(0, 8)}.service`;
}
/**
 * `~/.config/systemd/user/` ostiga birlik fayl yozadi va uni yoqadi.
 * Faqat Linux'da ishlaydi (systemd) — macOS/Windows hozircha qo'llab-
 * quvvatlanmaydi, bo'lsa aniq xabar bilan qaytariladi.
 */
export async function installAutoStart(appId) {
    const unitName = unitNameFor(appId);
    if (platform() !== 'linux') {
        return {
            ok: false,
            unitName,
            unitPath: '',
            message: 'Auto-start hozircha faqat Linux (systemd) uchun qo\'llab-quvvatlanadi.',
        };
    }
    const systemdUserDir = join(homedir(), '.config', 'systemd', 'user');
    const unitPath = join(systemdUserDir, unitName);
    // node dist/index.js orqali to'g'ridan-to'g'ri chaqiramiz — shunda PATH'da
    // "screenctl" borligiga bog'liq bo'lmaydi (systemd cheklangan env bilan ishlaydi).
    const nodeBin = process.execPath;
    const scriptPath = resolve(process.argv[1]);
    const unitContent = `[Unit]
Description=Screenctl Agent (${appId})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${nodeBin} ${scriptPath} agent start --app-id ${appId}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`;
    await mkdir(systemdUserDir, { recursive: true });
    await writeFile(unitPath, unitContent, 'utf-8');
    try {
        execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'ignore' });
        execFileSync('systemctl', ['--user', 'enable', '--now', unitName], { stdio: 'ignore' });
    }
    catch (err) {
        return {
            ok: false,
            unitName,
            unitPath,
            message: `Birlik fayl yozildi (${unitPath}), lekin "systemctl" ishga tushirilmadi: ${err instanceof Error ? err.message : String(err)}. Qo'lda: systemctl --user enable --now ${unitName}`,
        };
    }
    return { ok: true, unitName, unitPath, message: 'Auto-start yoqildi.' };
}
export async function uninstallAutoStart(appId) {
    const unitName = unitNameFor(appId);
    if (platform() !== 'linux')
        return;
    try {
        execFileSync('systemctl', ['--user', 'disable', '--now', unitName], { stdio: 'ignore' });
    }
    catch {
        // Yoqilmagan bo'lishi mumkin — jim o'tkazamiz
    }
}
export function isAutoStartInstalled(appId) {
    if (platform() !== 'linux')
        return false;
    const unitPath = join(homedir(), '.config', 'systemd', 'user', unitNameFor(appId));
    return existsSync(unitPath);
}
