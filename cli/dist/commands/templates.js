import chalk from 'chalk';
import { listTemplates, listPublicTemplates } from '../api/templates.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';
function printTemplateTable(templates) {
    if (templates.length === 0) {
        console.log(chalk.dim('Hech narsa topilmadi.'));
        return;
    }
    for (const t of templates) {
        const visibility = t.is_public ? chalk.green('public') : chalk.dim('private');
        console.log(`${chalk.bold(t.slug.padEnd(20))} ${t.name.padEnd(24)} ${chalk.dim(t.actions.join(', '))}  ${visibility}`);
    }
}
export async function templatesListCommand() {
    if (!isLoggedIn())
        return requireLogin();
    try {
        const templates = await listTemplates();
        console.log(chalk.bold(`\nYour templates (${templates.length})\n`));
        printTemplateTable(templates);
        console.log(chalk.dim('\nIshga tushirish uchun: screenctl run <slug>'));
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
export async function templatesPublicCommand(search) {
    try {
        const templates = await listPublicTemplates(search);
        console.log(chalk.bold(`\nPublic templates${search ? ` matching "${search}"` : ''} (${templates.length})\n`));
        printTemplateTable(templates);
    }
    catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
