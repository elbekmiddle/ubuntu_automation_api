import chalk from 'chalk';
import { logout as apiLogout } from '../api/auth.js';
import { readCredentials, clearCredentials } from '../config/store.js';
export async function logoutCommand() {
    const creds = readCredentials();
    if (!creds) {
        console.log(chalk.dim('Allaqachon chiqqansiz.'));
        return;
    }
    try {
        await apiLogout(creds.refreshToken);
    }
    catch {
        // Serverga yetib bo'lmasa ham, local tokenlarni baribir tozalaymiz.
    }
    clearCredentials();
    console.log(chalk.green('✓ Chiqildi'));
}
