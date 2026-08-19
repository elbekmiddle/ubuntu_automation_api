import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { printBanner } from '../ui/banner.js';
import { isLoggedIn, readCredentials } from '../config/store.js';
import { me } from '../api/auth.js';
import { loginCommand } from '../commands/login.js';
import { registerCommand } from '../commands/register.js';
import { runCommand } from '../commands/run.js';
import { templatesListCommand, templatesPublicCommand } from '../commands/templates.js';
import { devicesMenu } from '../commands/apps.js';
import { jobsListCommand } from '../commands/jobs.js';
import { accountMenu } from '../commands/account.js';
/** Login qilinmagan holatdagi kichik menyu (docs: "You're not logged in"). */
async function loggedOutMenu() {
    console.clear();
    printBanner();
    console.log(chalk.dim('You\'re not logged in.\n'));
    const choice = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Login', value: 'login' },
            { name: 'Register', value: 'register' },
            { name: 'Public templates', value: 'public' },
            { name: 'Exit', value: 'exit' },
        ],
    });
    switch (choice) {
        case 'login':
            await loginCommand();
            break;
        case 'register':
            await registerCommand();
            break;
        case 'public': {
            const q = await input({ message: 'Search (bo\'sh qoldirsa hammasi):', required: false });
            await templatesPublicCommand(q || undefined);
            await pause();
            break;
        }
        case 'exit':
            return 'exit';
    }
    return 'continue';
}
async function pause() {
    await input({ message: chalk.dim('Davom etish uchun Enter bosing...'), required: false });
}
const HOME_CHOICES = [
    { name: 'Run a template', value: 'run' },
    { name: 'Templates', value: 'templates' },
    { name: 'Devices', value: 'devices' },
    { name: 'Jobs', value: 'jobs' },
    { name: 'Public templates', value: 'public' },
    { name: 'Account', value: 'account' },
    { name: 'Help', value: 'help' },
    { name: 'Exit', value: 'exit' },
];
function printHelp() {
    console.log(chalk.bold('\nKeyboard\n'));
    console.log('  ↑ ↓      Navigate');
    console.log('  Enter    Select');
    console.log('  Ctrl+C   Cancel\n');
    console.log(chalk.bold('Shortcuts (argumentlar bilan to\'g\'ridan-to\'g\'ri)\n'));
    console.log('  screenctl run <template> [action] --yes');
    console.log('  screenctl templates');
    console.log('  screenctl public [search]');
    console.log('  screenctl apps');
    console.log('  screenctl login / logout / whoami\n');
}
async function renderHomeHeader() {
    console.clear();
    printBanner();
    const creds = readCredentials();
    try {
        const user = await me();
        console.log(chalk.green('●') + ` Connected as ${chalk.bold(user.email)}\n`);
    }
    catch {
        // Token muddati o'tgan bo'lishi mumkin — shunchaki email'ni ko'rsatamiz,
        // aslida so'rov (masalan "Run a template") o'zi keyinroq 401->refresh qiladi.
        console.log(chalk.green('●') + ` Connected as ${chalk.bold(creds?.userEmail ?? '')}\n`);
    }
}
async function homeMenu() {
    await renderHomeHeader();
    const choice = await select({
        message: 'What would you like to do?',
        choices: HOME_CHOICES.map((c) => ({ name: c.name, value: c.value })),
    });
    switch (choice) {
        case 'run':
            await runCommand();
            await pause();
            break;
        case 'templates':
            await templatesListCommand();
            await pause();
            break;
        case 'devices':
            await devicesMenu();
            break;
        case 'jobs':
            await jobsListCommand();
            await pause();
            break;
        case 'public': {
            const q = await input({ message: 'Search (bo\'sh qoldirsa hammasi):', required: false });
            await templatesPublicCommand(q || undefined);
            await pause();
            break;
        }
        case 'account': {
            const loggedOut = await accountMenu();
            if (loggedOut)
                return 'continue'; // keyingi loop loggedOutMenu'ga tushadi
            break;
        }
        case 'help':
            printHelp();
            await pause();
            break;
        case 'exit':
            return 'exit';
    }
    return 'continue';
}
export async function startInteractiveShell() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const result = isLoggedIn() ? await homeMenu() : await loggedOutMenu();
        if (result === 'exit')
            break;
    }
    console.log(chalk.dim('\nGoodbye.'));
}
