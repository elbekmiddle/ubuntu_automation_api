import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { listTemplates, getTemplate } from '../api/templates.js';
import { createJob, waitForJob } from '../api/jobs.js';
import { listApps } from '../api/apps.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
import type { App, Template } from '../types.js';

export interface RunOptions {
    action?: string;
    device?: string; // App ID yoki nomi — berilsa shu device'da masofada ishlaydi
    yes?: boolean; // confirm so'ramasdan darhol ishga tushirish
}

async function pickTemplate(preselected?: string): Promise<Template> {
    if (preselected) {
        return getTemplate(preselected);
    }

    const templates = await listTemplates();
    if (templates.length === 0) {
        throw new Error('Hali template yo\'q — avval screenctl.ai\'da yoki API orqali yarating.');
    }

    const slug = await select({
        message: 'Select template',
        choices: templates.map((t) => ({ name: t.name, value: t.slug, description: t.description ?? undefined })),
    });

    return templates.find((t) => t.slug === slug)!;
}

async function pickAction(template: Template, preselected?: string): Promise<string> {
    if (preselected) {
        if (!template.actions.includes(preselected)) {
            throw new Error(`"${preselected}" action "${template.slug}" template'ida yo'q. Mavjud: ${template.actions.join(', ')}`);
        }
        return preselected;
    }
    if (template.actions.length === 1) return template.actions[0];

    return select({
        message: 'Select action',
        choices: template.actions.map((a) => ({ name: a, value: a })),
    });
}

/**
 * Device tanlaydi. `null` qaytsa — "This machine (local)" tanlangan, ya'ni
 * job backend mashinasining o'zida ishlaydi (avvalgi xatti-harakat).
 * Hozircha ulangan device yo'q bo'lsa — savol bermay to'g'ridan-to'g'ri
 * local'ni tanlaydi (eski flow buzilmasin deb).
 */
async function pickDevice(preselected?: string): Promise<App | null> {
    let apps: App[] = [];
    try {
        apps = await listApps();
    } catch {
        return null; // login yo'q yoki xato — jim local'ga tushamiz
    }

    if (preselected) {
        const found = apps.find((a) => a.id === preselected || a.name === preselected);
        if (!found) {
            throw new Error(`"${preselected}" nomli/IDli device topilmadi.`);
        }
        return found;
    }

    if (apps.length === 0) return null; // hali device yo'q — local'ning o'zi

    const choice = await select({
        message: 'Select device',
        choices: [
            { name: 'This machine (local)', value: '__local__' },
            ...apps.map((a) => ({
                name: `${a.status === 'online' ? '●' : '○'} ${a.name}${a.status === 'offline' ? '  (offline)' : ''}`,
                value: a.id,
            })),
        ],
    });

    if (choice === '__local__') return null;
    return apps.find((a) => a.id === choice) ?? null;
}

export async function runCommand(templateArg?: string, opts: RunOptions = {}): Promise<void> {
    if (!isLoggedIn()) return requireLogin();

    try {
        const template = await pickTemplate(templateArg);
        const action = await pickAction(template, opts.action);
        const device = await pickDevice(opts.device);

        if (device && device.status === 'offline') {
            console.log();
            console.log(chalk.yellow(`⚠ Device is offline`));
            console.log(chalk.dim(`  "${device.name}" hasn't been seen recently.\n`));
            const proceedAnyway = await confirm({ message: 'Continue anyway?', default: false });
            if (!proceedAnyway) {
                console.log(chalk.dim('Bekor qilindi.'));
                return;
            }
        }

        console.log();
        console.log(chalk.dim('┌─────────────────────────────────────'));
        console.log(chalk.dim('│ ') + chalk.bold('Ready to execute'));
        console.log(chalk.dim('│'));
        console.log(chalk.dim('│ ') + `Template  ${template.name}`);
        console.log(chalk.dim('│ ') + `Action    ${action}`);
        console.log(chalk.dim('│ ') + `Device    ${device ? device.name : 'This machine (local)'}`);
        console.log(chalk.dim('└─────────────────────────────────────'));
        console.log();

        if (!opts.yes) {
            const proceed = await confirm({ message: 'Execute?', default: true });
            if (!proceed) {
                console.log(chalk.dim('Bekor qilindi.'));
                return;
            }
        }

        console.log(chalk.dim(`\nRunning ${template.name} / ${action}${device ? ` on ${device.name}` : ''}...\n`));

        const job = await createJob(template.slug, action, {}, device?.id);
        const startedAt = Date.now();

        const finished = await waitForJob(job.id, (line) => {
            const prefix = line.stream === 'stderr' ? chalk.red('│') : chalk.dim('│');
            process.stdout.write(`${prefix} ${line.chunk}`);
        });

        const durationMs = Date.now() - startedAt;
        console.log();

        if (finished.status === 'success') {
            console.log(chalk.green(`✓ Completed in ${durationMs}ms`));
        } else {
            console.log(chalk.red(`✕ Failed (exit code ${finished.exit_code ?? '?'})`));
            process.exitCode = 1;
        }
        console.log(chalk.dim(`  Job: ${finished.id}`));
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
