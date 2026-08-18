import chalk from 'chalk';
import { input } from '@inquirer/prompts';
import { listApps, createApp } from '../api/apps.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
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
            console.log(chalk.dim('Hali app yo\'q — yaratish uchun: screenctl app create'));
            return;
        }
        console.log(chalk.bold('\nApplications\n'));
        for (const app of apps) {
            console.log(`${statusDot(app)} ${chalk.bold(app.name)}`);
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
export async function appCreateCommand(opts = {}) {
    if (!isLoggedIn())
        return requireLogin();
    const name = opts.name ?? (await input({ message: 'App name:' }));
    try {
        const { app, registrationToken } = await createApp(name);
        console.log(chalk.green(`\n✓ App created: ${app.name}`));
        console.log(chalk.dim(`  App ID: ${app.id}\n`));
        console.log(chalk.yellow('Registration token (faqat bir marta ko\'rsatiladi, saqlab qo\'ying):'));
        console.log(`  ${registrationToken}\n`);
        console.log(chalk.dim('Agentni shu mashinada ishga tushirish uchun:'));
        console.log(chalk.dim(`  screenctl-agent --app-id ${app.id} --token <yuqoridagi token>`));
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
