import chalk from 'chalk';
import { input, confirm } from '@inquirer/prompts';
import { listApps, createApp, removeApp } from '../api/apps.js';
import { isLoggedIn, saveAgent, readConfig } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
import { getStaticSystemInfo } from '../agent/collect.js';
import { runAgent } from '../agent/run.js';
function statusDot(app) {
    return app.status === 'online' ? chalk.green('●') : chalk.dim('○');
}
function timeAgo(iso) {
    if (!iso)
        return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60)
        return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}
export async function appsListCommand() {
    if (!isLoggedIn())
        return requireLogin();
    try {
        const apps = await listApps();
        if (apps.length === 0) {
            console.log(chalk.dim('Hali ulangan device yo\'q — ulash uchun: screenctl app connect'));
            return;
        }
        console.log(chalk.bold(`\nDevices (${apps.length})\n`));
        for (const app of apps) {
            console.log(`${statusDot(app)} ${chalk.bold(app.name)}`);
            if (app.hostname)
                console.log(chalk.dim(`  ${app.hostname}`));
            if (app.os_platform)
                console.log(chalk.dim(`  ${app.os_platform} ${app.os_release ?? ''}`.trim()));
            console.log(chalk.dim(`  ${app.status} · last seen ${timeAgo(app.last_seen_at)}`));
            console.log();
        }
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
/**
 * Doc'dagi "Connect this computer" flow'i:
 *  1. Device nomi so'raladi (default = shu mashinaning hostname'i)
 *  2. Backendda app + registration token yaratiladi
 *  3. Token shu mashinada (~/.screenctl/agents.json) saqlanadi
 *  4. Foydalanuvchidan agentni darhol ishga tushirish so'raladi
 */
export async function appCreateCommand(opts = {}) {
    if (!isLoggedIn())
        return requireLogin();
    const detected = getStaticSystemInfo();
    console.log(chalk.bold('\nConnect this computer\n'));
    console.log(chalk.dim('Detecting system...\n'));
    console.log(`  ${chalk.green('✓')} Hostname       ${detected.hostname}`);
    console.log(`  ${chalk.green('✓')} Platform       ${detected.osPlatform} ${detected.osRelease}`);
    console.log(`  ${chalk.green('✓')} Architecture   ${detected.arch}`);
    console.log(`  ${chalk.green('✓')} CPU            ${detected.cores} cores\n`);
    const name = opts.name ?? (await input({ message: 'Device name:', default: detected.hostname }));
    try {
        const { app, registrationToken } = await createApp(name);
        console.log(chalk.green(`\n✓ Device created: ${app.name}`));
        console.log(chalk.dim(`  Device ID: ${app.id}`));
        const { apiUrl } = readConfig();
        saveAgent({
            appId: app.id,
            name: app.name,
            registrationToken,
            apiUrl,
            createdAt: new Date().toISOString(),
        });
        console.log(chalk.dim(`  Agent credentials saved to ~/.screenctl/agents.json\n`));
        const startNow = opts.yes ?? (await confirm({ message: 'Start the Screenctl Agent on this machine now?', default: true }));
        if (!startNow) {
            console.log(chalk.dim('\nTo connect this machine later, run:'));
            console.log(`  screenctl agent start --app-id ${app.id}\n`);
            console.log(chalk.dim('To run it as a background service, use the printed command with your'));
            console.log(chalk.dim('process manager of choice (systemd, pm2, etc.), e.g.:\n'));
            console.log(chalk.dim('  [Unit]'));
            console.log(chalk.dim('  Description=Screenctl Agent'));
            console.log(chalk.dim('  After=network-online.target\n'));
            console.log(chalk.dim('  [Service]'));
            console.log(chalk.dim(`  ExecStart=screenctl agent start --app-id ${app.id}`));
            console.log(chalk.dim('  Restart=always'));
            console.log(chalk.dim('  RestartSec=5\n'));
            console.log(chalk.dim('  [Install]'));
            console.log(chalk.dim('  WantedBy=multi-user.target\n'));
            return;
        }
        console.log(chalk.dim('\nInstalling Screenctl Agent...\n'));
        console.log(chalk.dim('Connecting to Screenctl...'));
        console.log(chalk.dim(`Device: ${app.name}\n`));
        const { stop } = runAgent({ apiUrl, appId: app.id, registrationToken });
        console.log(chalk.dim('Agent is running in the foreground. Press Ctrl+C to stop.\n'));
        let shuttingDown = false;
        const shutdown = async () => {
            if (shuttingDown)
                return;
            shuttingDown = true;
            console.log(chalk.dim('\nStopping agent...'));
            await stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        await new Promise(() => { });
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
export async function appRemoveCommand(id) {
    if (!isLoggedIn())
        return requireLogin();
    try {
        await removeApp(id);
        console.log(chalk.green(`✓ Device disconnected: ${id}`));
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
