#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login.js';
import { registerCommand } from './commands/register.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { appsListCommand, appCreateCommand, appRemoveCommand, appStopCommand } from './commands/apps.js';
import { agentStartCommand, agentListCommand } from './commands/agent.js';
import { templatesListCommand, templatesPublicCommand } from './commands/templates.js';
import { jobsListCommand } from './commands/jobs.js';
import { runCommand } from './commands/run.js';
import { startInteractiveShell } from './shell/home.js';
import { suggestCommand } from './utils/suggestions.js';
// Doc'dagi shorthand uslub ("screenctl --login") ham qo'llab-quvvatlanadi —
// argv'dagi birinchi "--xxx"ni mos subcommand'ga almashtiramiz.
const SHORTHAND_MAP = {
    '--login': ['login'],
    '--logout': ['logout'],
    '--whoami': ['whoami'],
    '--register': ['register'],
    '--app': ['app', 'create'],
    '--apps': ['apps'],
    '--templates': ['templates'],
    '--public': ['public'],
    '--jobs': ['jobs'],
    '--run': ['run'],
};
function buildProgram() {
    const program = new Command();
    program
        .name('screenctl')
        .description('Screenctl CLI — system automation platform client')
        .version('0.1.0');
    program.command('login').description('Login to Screenctl')
        .option('-e, --email <email>').option('-p, --password <password>')
        .action(async (opts) => loginCommand(opts));
    program.command('register').description('Create a new Screenctl account')
        .option('-e, --email <email>').option('-p, --password <password>').option('-n, --name <name>')
        .action(async (opts) => registerCommand(opts));
    program.command('logout').description('Logout from Screenctl')
        .action(async () => logoutCommand());
    program.command('whoami').description('Show the currently logged-in user')
        .action(async () => whoamiCommand());
    const app = program.command('app').description('Manage connected devices (this machine included)');
    app.command('create').description('Connect this computer to Screenctl (alias: connect)')
        .option('-n, --name <name>')
        .option('-y, --yes', 'Skip prompts — start the agent immediately')
        .action(async (opts) => appCreateCommand(opts));
    app.command('connect').description('Connect this computer to Screenctl')
        .option('-n, --name <name>')
        .option('-y, --yes', 'Skip prompts — start the agent immediately')
        .action(async (opts) => appCreateCommand(opts));
    app.command('list').description('List your connected devices')
        .action(async () => appsListCommand());
    app.command('remove <id>').description('Disconnect a device')
        .action(async (id) => appRemoveCommand(id));
    app.command('stop <id>').description('Stop the background agent (and auto-start service) for a device')
        .action(async (id) => appStopCommand(id));
    program.command('apps').description('Alias for "app list"')
        .action(async () => appsListCommand());
    const agent = program.command('agent').description('Run the Screenctl Agent on this machine');
    agent.command('start').description('Start the agent (connects this machine\'s stats to Screenctl)')
        .option('--app-id <id>')
        .option('--token <token>')
        .action(async (opts) => agentStartCommand(opts));
    agent.command('list').description('List agents saved on this machine')
        .action(async () => agentListCommand());
    const template = program.command('template').description('Manage templates');
    template.command('list').description('List your templates')
        .action(async () => templatesListCommand());
    template.command('public [search]').description('Search public/community templates')
        .action(async (search) => templatesPublicCommand(search));
    program.command('templates').description('Alias for "template list"')
        .action(async () => templatesListCommand());
    program.command('public [search]').description('Alias for "template public"')
        .action(async (search) => templatesPublicCommand(search));
    program.command('jobs').description('List recent jobs')
        .action(async () => jobsListCommand());
    program.command('run [template] [action]')
        .description('Run a template action — interactive if arguments are omitted')
        .option('-d, --device <appIdOrName>', 'Run on a specific connected device instead of locally')
        .option('-y, --yes', 'Skip the confirmation prompt')
        .action(async (templateArg, actionArg, opts) => {
        await runCommand(templateArg, { action: actionArg, device: opts?.device, yes: opts?.yes });
    });
    return program;
}
function rewriteShorthandArgs(argv) {
    const [node, script, ...rest] = argv;
    if (rest.length === 0)
        return argv;
    const first = rest[0];
    if (first in SHORTHAND_MAP) {
        return [node, script, ...SHORTHAND_MAP[first], ...rest.slice(1)];
    }
    return argv;
}
function printUnknownShorthand(flag) {
    const stripped = flag.replace(/^--/, '');
    const suggestion = suggestCommand(stripped, Object.keys(SHORTHAND_MAP).map((k) => k.replace(/^--/, '')));
    console.error(chalk.red(`Unknown command: ${flag}`));
    if (suggestion) {
        console.error(chalk.dim('\nDid you mean:\n'));
        console.error(`  --${suggestion}`);
    }
    console.error(chalk.dim('\nUse:\n  screenctl --help'));
    process.exit(1);
}
async function main() {
    const rawArgs = process.argv.slice(2);
    // `screenctl` — argumentsiz — interaktiv home shell'ni ochadi.
    // (Doc: "Userga command yodlatmaymiz" — bu asosiy UX.)
    if (rawArgs.length === 0) {
        await startInteractiveShell();
        return;
    }
    const first = rawArgs[0];
    // Noma'lum "--xxx" flag — "did you mean" bilan chiqib ketamiz.
    if (first.startsWith('--') && !(first in SHORTHAND_MAP) && first !== '--help' && first !== '--version') {
        printUnknownShorthand(first);
        return;
    }
    const rewritten = rewriteShorthandArgs(process.argv);
    await buildProgram().parseAsync(rewritten);
}
main().catch((err) => {
    console.error(chalk.red(`✕ ${err instanceof Error ? err.message : 'Unexpected error'}`));
    process.exit(1);
});
