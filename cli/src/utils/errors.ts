import chalk from 'chalk';
import { ApiError } from '../api/client.js';

export function printError(error: unknown): void {
    if (error instanceof ApiError) {
        console.error(chalk.red(`✕ ${error.message}`));
        if (error.code) console.error(chalk.dim(`  code: ${error.code}`));
        if (error.hint) console.error(chalk.yellow(`  → ${error.hint}`));
        return;
    }
    if (error instanceof Error) {
        console.error(chalk.red(`✕ ${error.message}`));
        return;
    }
    console.error(chalk.red('✕ Noma\'lum xatolik yuz berdi'));
}

export function requireLogin(): void {
    console.error(chalk.red('✕ Avval kirishingiz kerak: ') + chalk.bold('screenctl login'));
    process.exit(1);
}
