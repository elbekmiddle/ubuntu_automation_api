import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import { register as apiRegister } from '../api/auth.js';
import { writeCredentials } from '../config/store.js';
import { printBanner } from '../ui/banner.js';
import { printError } from '../utils/errors.js';

export async function registerCommand(opts: { email?: string; password?: string; name?: string } = {}): Promise<void> {
    printBanner();
    console.log(chalk.bold('Create account\n'));

    const email = opts.email ?? (await input({ message: 'Email:' }));
    const name = opts.name ?? (await input({ message: 'Name (optional):', required: false }));
    const password =
        opts.password ??
        (await passwordPrompt({
            message: 'Password (kamida 8 belgi):',
            mask: '*',
            validate: (v) => v.length >= 8 || 'Parol kamida 8 belgidan iborat bo\'lishi kerak',
        }));

    process.stdout.write(chalk.dim('Creating account...\n'));

    try {
        const { user, tokens } = await apiRegister(email, password, name || undefined);
        writeCredentials({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userEmail: user.email,
        });
        console.log(chalk.green(`\n✓ Account created — logged in as ${user.email}`));
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
