import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Config {
    apiUrl: string;
}

export interface Credentials {
    accessToken: string;
    refreshToken: string;
    userEmail: string;
}

const SCREENCTL_DIR = join(homedir(), '.screenctl');
const CONFIG_PATH = join(SCREENCTL_DIR, 'config.json');
const CREDENTIALS_PATH = join(SCREENCTL_DIR, 'credentials.json');

const DEFAULT_CONFIG: Config = {
    apiUrl: process.env.SCREENCTL_API_URL ?? 'http://localhost:3000',
};

function ensureDir(): void {
    if (!existsSync(SCREENCTL_DIR)) {
        mkdirSync(SCREENCTL_DIR, { recursive: true, mode: 0o700 });
    }
}

export function readConfig(): Config {
    ensureDir();
    if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    try {
        const raw = readFileSync(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<Config>) };
    } catch {
        return DEFAULT_CONFIG;
    }
}

export function writeConfig(config: Partial<Config>): void {
    ensureDir();
    const merged = { ...readConfig(), ...config };
    writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

/**
 * Diqqat: bu yerda plaintext PAROL hech qachon saqlanmaydi — faqat login
 * paytida backend qaytargan access/refresh tokenlar. Fayl ruxsati 0600
 * (faqat egasi o'qiy oladi).
 */
export function readCredentials(): Credentials | null {
    ensureDir();
    if (!existsSync(CREDENTIALS_PATH)) return null;
    try {
        const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
        return JSON.parse(raw) as Credentials;
    } catch {
        return null;
    }
}

export function writeCredentials(creds: Credentials): void {
    ensureDir();
    writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), { encoding: 'utf-8', mode: 0o600 });
    chmodSync(CREDENTIALS_PATH, 0o600);
}

export function clearCredentials(): void {
    ensureDir();
    if (existsSync(CREDENTIALS_PATH)) {
        writeFileSync(CREDENTIALS_PATH, '', { mode: 0o600 });
    }
}

export function isLoggedIn(): boolean {
    return readCredentials() !== null;
}
