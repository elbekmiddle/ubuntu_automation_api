import chalk from 'chalk';
import { readAgent, listAgents, readConfig } from '../config/store.js';
import { runAgent } from '../agent/run.js';
import { getApp } from '../api/apps.js';

export interface AgentStartOptions {
    appId?: string;
    token?: string;
}

export async function agentStartCommand(opts: AgentStartOptions = {}): Promise<void> {
    let appId = opts.appId;
    let registrationToken = opts.token;

    if (!appId) {
        const agents = listAgents();
        if (agents.length === 0) {
            console.error(chalk.red('✕ Bu mashinada saqlangan agent topilmadi.'));
            console.error(chalk.dim('  Avval: screenctl app connect'));
            process.exitCode = 1;
            return;
        }
        if (agents.length === 1) {
            appId = agents[0].appId;
            registrationToken = registrationToken ?? agents[0].registrationToken;
        } else {
            console.error(chalk.red('✕ Bir nechta agent saqlangan — --app-id ko\'rsating:'));
            for (const a of agents) console.error(chalk.dim(`  ${a.appId}  (${a.name})`));
            process.exitCode = 1;
            return;
        }
    }

    if (!registrationToken) {
        const saved = readAgent(appId);
        if (!saved) {
            console.error(chalk.red(`✕ "${appId}" uchun saqlangan token topilmadi — --token bilan bering.`));
            process.exitCode = 1;
            return;
        }
        registrationToken = saved.registrationToken;
    }

    try {
        const app = await getApp(appId);
        console.log(chalk.bold(`\nStarting Screenctl Agent — ${app.name}\n`));
    } catch {
        console.log(chalk.bold(`\nStarting Screenctl Agent — ${appId}\n`));
    }

    const { apiUrl } = readConfig();
    const { stop } = runAgent({ apiUrl, appId, registrationToken });

    console.log(chalk.dim('Press Ctrl+C to stop.\n'));

    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(chalk.dim('\nStopping agent...'));
        await stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Process foreground'da tirik qolishi kerak — socket.io o'z ichida
    // event loop'ni band qiladi, shuning uchun qo'shimcha hech narsa kerak emas.
    await new Promise(() => {});
}

export async function agentListCommand(): Promise<void> {
    const agents = listAgents();
    if (agents.length === 0) {
        console.log(chalk.dim('Bu mashinada saqlangan agent yo\'q.'));
        return;
    }
    console.log(chalk.bold('\nSaved agents on this machine\n'));
    for (const a of agents) {
        console.log(`${chalk.bold(a.name)}  ${chalk.dim(a.appId)}`);
        console.log(chalk.dim(`  ${a.apiUrl} · saved ${a.createdAt}`));
    }
}
