import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { logoutCommand } from './logout.js';
import { readCredentials } from '../config/store.js';
/** @returns true agar user logout qilgan bo'lsa (shell'ni login ekraniga qaytarish uchun) */
export async function accountMenu() {
    const creds = readCredentials();
    console.log();
    console.log(chalk.bold('Account'));
    if (creds)
        console.log(chalk.dim(creds.userEmail));
    console.log();
    const choice = await select({
        message: 'Account',
        choices: [
            { name: 'Logout', value: 'logout' },
            { name: '← Back', value: 'back' },
        ],
    });
    if (choice === 'logout') {
        const sure = await confirm({ message: 'Logout from this device?', default: false });
        if (sure) {
            await logoutCommand();
            return true;
        }
    }
    return false;
}
