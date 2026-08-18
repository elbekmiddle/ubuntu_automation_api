import chalk from 'chalk';
import { me } from '../api/auth.js';
import { isLoggedIn } from '../config/store.js';
import { printError, requireLogin } from '../utils/errors.js';

export async function whoamiCommand(): Promise<void> {
    if (!isLoggedIn()) {
        requireLogin();
        return;
    }

    try {
        const user = await me();
        console.log(`${chalk.bold(user.email)}${user.name ? chalk.dim(`  (${user.name})`) : ''}`);
    } catch (err) {
        printError(err);
        process.exitCode = 1;
    }
}
