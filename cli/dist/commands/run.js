import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { listTemplates, getTemplate } from '../api/templates.js';
import { createJob, waitForJob } from '../api/jobs.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
async function pickTemplate(preselected) {
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
    return templates.find((t) => t.slug === slug);
}
async function pickAction(template, preselected) {
    if (preselected) {
        if (!template.actions.includes(preselected)) {
            throw new Error(`"${preselected}" action "${template.slug}" template'ida yo'q. Mavjud: ${template.actions.join(', ')}`);
        }
        return preselected;
    }
    if (template.actions.length === 1)
        return template.actions[0];
    return select({
        message: 'Select action',
        choices: template.actions.map((a) => ({ name: a, value: a })),
    });
}
export async function runCommand(templateArg, opts = {}) {
    if (!isLoggedIn())
        return requireLogin();
    try {
        const template = await pickTemplate(templateArg);
        const action = await pickAction(template, opts.action);
        console.log();
        console.log(chalk.dim('┌─────────────────────────────────────'));
        console.log(chalk.dim('│ ') + chalk.bold('Ready to execute'));
        console.log(chalk.dim('│'));
        console.log(chalk.dim('│ ') + `Template  ${template.name}`);
        console.log(chalk.dim('│ ') + `Action    ${action}`);
        console.log(chalk.dim('└─────────────────────────────────────'));
        console.log();
        if (!opts.yes) {
            const proceed = await confirm({ message: 'Execute?', default: true });
            if (!proceed) {
                console.log(chalk.dim('Bekor qilindi.'));
                return;
            }
        }
        console.log(chalk.dim(`\nRunning ${template.name} / ${action}...\n`));
        const job = await createJob(template.slug, action);
        const startedAt = Date.now();
        const finished = await waitForJob(job.id, (line) => {
            const prefix = line.stream === 'stderr' ? chalk.red('│') : chalk.dim('│');
            process.stdout.write(`${prefix} ${line.chunk}`);
        });
        const durationMs = Date.now() - startedAt;
        console.log();
        if (finished.status === 'success') {
            console.log(chalk.green(`✓ Completed in ${durationMs}ms`));
        }
        else {
            console.log(chalk.red(`✕ Failed (exit code ${finished.exit_code ?? '?'})`));
            process.exitCode = 1;
        }
        console.log(chalk.dim(`  Job: ${finished.id}`));
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
