import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { listApps, createApp, removeApp, getApp } from '../api/apps.js';
import { isLoggedIn, saveAgent, readConfig, getOrCreateMachineId, updateAgentPid, readAgent } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
import { getStaticSystemInfo } from '../agent/collect.js';
import { runAgent } from '../agent/run.js';
import { installAutoStart, uninstallAutoStart, isAutoStartInstalled } from '../agent/autostart.js';
import { spawnDetachedAgent, isProcessAlive, stopDetachedAgent } from '../agent/daemon.js';
import type { App, AppPermission } from '../types.js';

function statusDot(app: App): string {
    return app.status === 'online' ? chalk.green('●') : chalk.dim('○');
}

function permissionLabel(permission: AppPermission): string {
    return permission === 'read_only' ? 'Read Only' : 'Read & Write';
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

export async function appsListCommand(): Promise<void> {
    if (!isLoggedIn()) return requireLogin();

    try {
        const apps = await listApps();
        if (apps.length === 0) {
            console.log(chalk.dim('Hali ulangan device yo\'q — ulash uchun: screenctl app connect'));
            return;
        }
        console.log(chalk.bold(`\nDevices (${apps.length})\n`));
        for (const app of apps) {
            console.log(`${statusDot(app)} ${chalk.bold(app.name)}`);
            if (app.hostname) console.log(chalk.dim(`  ${app.hostname}`));
            if (app.os_platform) console.log(chalk.dim(`  ${app.os_platform} ${app.os_release ?? ''}`.trim()));
            console.log(chalk.dim(`  ${app.status} · ${permissionLabel(app.permission)} · last seen ${timeAgo(app.last_seen_at)}`));
            console.log();
        }
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}

/**
 * "Connect this computer" flow:
 *  1. Device nomi so'raladi
 *  2. Permission tanlanadi
 *  3. Backendga shu MASHINANING machine_id'i (barqaror, mahalliy) bilan
 *     birga POST qilinadi — agar bu user shu mashinada avval ham App
 *     yaratgan bo'lsa, backend YANGISINI yaratmaydi, eskisini reconnect
 *     qiladi (faqat registration token yangilanadi).
 *  4. Token shu mashinada saqlanadi
 *  5. Auto-start on boot? (systemd) — Yes/No, ochiq-oydin so'raladi
 *  6. Yo'q desa — baribir agent DETACHED (background) process sifatida
 *     ishga tushadi, ya'ni CLI'dan chiqib ketilsa ham agent o'lmaydi
 *     (faqat shu login sessiyasi davomida — reboot'dan keyin systemd kerak).
 */
export async function appCreateCommand(opts: { name?: string; yes?: boolean; permission?: AppPermission } = {}): Promise<void> {
    if (!isLoggedIn()) return requireLogin();

    const detected = getStaticSystemInfo();

    console.log(chalk.bold('\nConnect this computer\n'));
    console.log(chalk.dim('Detecting system...\n'));
    console.log(`  ${chalk.green('✓')} Hostname       ${detected.hostname}`);
    console.log(`  ${chalk.green('✓')} Platform       ${detected.osPlatform} ${detected.osRelease}`);
    console.log(`  ${chalk.green('✓')} Architecture   ${detected.arch}`);
    console.log(`  ${chalk.green('✓')} CPU            ${detected.cores} cores\n`);

    const name = opts.name ?? (await input({ message: 'Device name:', default: detected.hostname }));

    const permission =
        opts.permission ??
        (await select<AppPermission>({
            message: 'Permission',
            choices: [
                { name: 'Read & Write', value: 'read_write', description: 'Monitoring + template/action ijrosi' },
                { name: 'Read Only', value: 'read_only', description: 'Faqat monitoring — ijro yo\'q' },
            ],
        }));

    try {
        const machineId = getOrCreateMachineId();
        const { app, registrationToken, reconnected } = await createApp(name, permission, machineId);

        if (reconnected) {
            console.log(chalk.green(`\n✓ Reconnected to existing device: ${app.name}`));
            console.log(chalk.dim(`  Bu mashina avval ham ulangan edi — yangi device yaratilmadi.`));
        } else {
            console.log(chalk.green(`\n✓ Device created: ${app.name}`));
        }
        console.log(chalk.dim(`  Device ID: ${app.id}`));
        console.log(chalk.dim(`  Permission: ${permissionLabel(app.permission)}`));

        const { apiUrl } = readConfig();
        saveAgent({
            appId: app.id,
            name: app.name,
            registrationToken,
            apiUrl,
            createdAt: new Date().toISOString(),
        });
        console.log(chalk.dim(`  Agent credentials saved to ~/.screenctl/agents.json\n`));

        // 1) Auto-start on boot? (faqat Linux/systemd, MVP)
        // --yes rejimida bu savol berilmaydi — tizim xizmati o'rnatish
        // jimgina (default) sodir bo'lmasligi kerak, faqat ochiq-oydin so'rab.
        const wantsAutoStart = opts.yes ? false : await confirm({
            message: 'Start automatically when this computer boots?',
            default: true,
        });

        if (wantsAutoStart) {
            console.log(chalk.dim('\nInstalling background service...'));
            const result = await installAutoStart(app.id);
            if (result.ok) {
                console.log(chalk.green(`✓ Auto-start enabled (${result.unitName})`));
                console.log(chalk.dim(`  This device will reconnect automatically after every reboot.\n`));
                return;
            }
            console.log(chalk.yellow(`⚠ ${result.message}`));
            console.log(chalk.dim('  Auto-start ishlamadi, buning o\'rniga background\'da ishga tushiramiz.\n'));
        }

        // 2) Auto-start yo'q (yoki muvaffaqiyatsiz) — baribir CLI yopilsa
        // ham davom etadigan DETACHED background process qilib qo'yamiz.
        const startNow =
            opts.yes ?? (await confirm({ message: 'Start the Screenctl Agent now (in the background)?', default: true }));

        if (!startNow) {
            console.log(chalk.dim('\nTo connect this machine later, run:'));
            console.log(`  screenctl agent start --app-id ${app.id}\n`);
            return;
        }

        const pid = spawnDetachedAgent(app.id);
        if (pid) {
            updateAgentPid(app.id, pid);
            console.log(chalk.green(`✓ Agent started in background (pid ${pid})`));
            console.log(chalk.dim(`  Terminalni yopsangiz ham agent ishlashda davom etadi.`));
            console.log(chalk.dim(`  To'xtatish uchun: screenctl app stop ${app.id}\n`));
        } else {
            console.log(chalk.yellow('⚠ Background process boshlanmadi.'));
        }
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}

/** Detached (background) agent process'ni to'xtatadi — o'rnatilgan bo'lsa systemd'ni ham. */
export async function appStopCommand(id: string): Promise<void> {
    let stopped = false;

    if (isAutoStartInstalled(id)) {
        await uninstallAutoStart(id);
        console.log(chalk.dim('Auto-start service o\'chirildi'));
        stopped = true;
    }

    const saved = readAgent(id);
    if (saved?.pid && isProcessAlive(saved.pid)) {
        stopDetachedAgent(saved.pid);
        updateAgentPid(id, undefined);
        console.log(chalk.dim(`Background process (pid ${saved.pid}) to'xtatildi`));
        stopped = true;
    }

    if (stopped) {
        console.log(chalk.green(`✓ Agent to'xtatildi: ${id}`));
    } else {
        console.log(chalk.dim(`"${id}" uchun ishlab turgan agent topilmadi (allaqachon to'xtagan bo'lishi mumkin).`));
    }
}

export async function appRemoveCommand(id: string): Promise<void> {
    if (!isLoggedIn()) return requireLogin();
    try {
        await appStopCommand(id);
        await removeApp(id);
        console.log(chalk.green(`✓ Device disconnected: ${id}`));
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}

/**
 * Bitta device tafsiloti — doc'dagi "Overview" ekrani. Processes/Ports/
 * Docker/Services/Network bo'limlari hali yo'q (agentda collector'lar
 * yozilmagan) — shuning uchun hozircha faqat mavjud maydonlar ko'rsatiladi.
 */
async function deviceDetail(app: App): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        console.clear();
        console.log(chalk.bold(`\n${app.name}\n`));
        console.log(`${statusDot(app)} ${app.status === 'online' ? 'ONLINE' : 'OFFLINE'}\n`);
        if (app.os_platform) console.log(`${app.os_platform} ${app.os_release ?? ''}`.trim());
        console.log(`Permission     ${permissionLabel(app.permission)}`);
        console.log(`Auto-start     ${isAutoStartInstalled(app.id) ? chalk.green('Enabled') : chalk.dim('Disabled')}`);
        console.log(`Last heartbeat ${timeAgo(app.last_seen_at)}`);

        const metrics = app.last_metrics as { cpu?: number; memory?: { usedPercent?: number }; disk?: { usedPercent?: number } | null };
        if (metrics?.cpu != null) {
            console.log();
            console.log(`CPU            ${metrics.cpu}%`);
            if (metrics.memory?.usedPercent != null) console.log(`Memory         ${metrics.memory.usedPercent}%`);
            if (metrics.disk?.usedPercent != null) console.log(`Disk           ${metrics.disk.usedPercent}%`);
        }
        console.log();

        const choice = await select({
            message: 'Actions',
            choices: [
                { name: 'Refresh', value: 'refresh' },
                { name: 'Disconnect', value: 'disconnect' },
                { name: '← Back', value: 'back' },
            ],
        });

        if (choice === 'refresh') {
            try {
                app = await getApp(app.id);
            } catch (err) {
                printError(err);
            }
            continue;
        }

        if (choice === 'disconnect') {
            const sure = await confirm({ message: `Disconnect "${app.name}"?`, default: false });
            if (sure) {
                await appRemoveCommand(app.id);
                return;
            }
            continue;
        }

        return; // back
    }
}

/**
 * Doc'dagi "Devices" ekrani: `+ Connect this computer` birinchi qatorda,
 * keyin mavjud device'lar status bilan. Device tanlansa — detail ekrani.
 */
export async function devicesMenu(): Promise<void> {
    if (!isLoggedIn()) return requireLogin();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        let apps: App[];
        try {
            apps = await listApps();
        } catch (err) {
            printError(err);
            return;
        }

        console.log(chalk.bold(`\nDevices (${apps.length})\n`));

        const choice = await select({
            message: 'Devices',
            choices: [
                { name: '+ Connect this computer', value: '__connect__' },
                ...apps.map((a) => ({
                    name: `${a.status === 'online' ? '●' : '○'} ${a.name}${a.hostname ? `  (${a.hostname})` : ''}`,
                    value: a.id,
                })),
                { name: '← Back', value: '__back__' },
            ],
        });

        if (choice === '__back__') return;

        if (choice === '__connect__') {
            await appCreateCommand();
            continue;
        }

        const selected = apps.find((a) => a.id === choice);
        if (selected) await deviceDetail(selected);
    }
}
