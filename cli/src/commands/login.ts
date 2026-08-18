import { input, password as passwordPrompt } from '@inquirer/prompts';
import chalk from 'chalk';
import { login as apiLogin } from '../api/auth.js';
import { writeCredentials } from '../config/store.js';
import { printBanner } from '../ui/banner.js';
import { printError } from '../utils/errors.js';

export async function loginCommand(opts: { email?: string; password?: string } = {}): Promise<void> {
    printBanner();
    console.log(chalk.bold('Login\n'));

    const email = opts.email ?? (await input({ message: 'Email:' }));
    const password = opts.password ?? (await passwordPrompt({ message: 'Password:', mask: '*' }));

    process.stdout.write(chalk.dim('Authenticating...\n'));

    try {
        const { user, tokens } = await apiLogin(email, password);
        writeCredentials({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userEmail: user.email,
        });
        console.log(chalk.green(`\n✓ Successfully logged in as ${user.email}`));
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
