import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import machineId from 'node-machine-id';
const { machineIdSync } = machineId;
const SCREENCTL_DIR = join(homedir(), '.screenctl');
const CONFIG_PATH = join(SCREENCTL_DIR, 'config.json');
const CREDENTIALS_PATH = join(SCREENCTL_DIR, 'credentials.json');
const AGENTS_PATH = join(SCREENCTL_DIR, 'agents.json');
const MACHINE_ID_PATH = join(SCREENCTL_DIR, 'machine-id');
const DEFAULT_CONFIG = {
    apiUrl: process.env.SCREENCTL_API_URL ?? 'https://screen-api.honeymedia.uz',
};
function ensureDir() {
    if (!existsSync(SCREENCTL_DIR)) {
        mkdirSync(SCREENCTL_DIR, { recursive: true, mode: 0o700 });
    }
}
export function readConfig() {
    ensureDir();
    if (!existsSync(CONFIG_PATH))
        return DEFAULT_CONFIG;
    try {
        const raw = readFileSync(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_CONFIG;
    }
}
export function writeConfig(config) {
    ensureDir();
    const merged = { ...readConfig(), ...config };
    writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}
/**
 * Diqqat: bu yerda plaintext PAROL hech qachon saqlanmaydi — faqat login
 * paytida backend qaytargan access/refresh tokenlar. Fayl ruxsati 0600
 * (faqat egasi o'qiy oladi).
 */
export function readCredentials() {
    ensureDir();
    if (!existsSync(CREDENTIALS_PATH))
        return null;
    try {
        const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function writeCredentials(creds) {
    ensureDir();
    writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), { encoding: 'utf-8', mode: 0o600 });
    chmodSync(CREDENTIALS_PATH, 0o600);
}
export function clearCredentials() {
    ensureDir();
    if (existsSync(CREDENTIALS_PATH)) {
        writeFileSync(CREDENTIALS_PATH, '', { mode: 0o600 });
    }
}
export function isLoggedIn() {
    return readCredentials() !== null;
}
/**
 * Har bir "app create" / "app connect" natijasida registration token shu
 * yerga (0600) saqlanadi — shunda `screenctl agent start --app-id X` uchun
 * tokenni qo'lda qayta kiritish shart bo'lmaydi.
 */
function readAgents() {
    ensureDir();
    if (!existsSync(AGENTS_PATH))
        return {};
    try {
        return JSON.parse(readFileSync(AGENTS_PATH, 'utf-8'));
    }
    catch {
        return {};
    }
}
export function saveAgent(entry) {
    ensureDir();
    const all = readAgents();
    all[entry.appId] = entry;
    writeFileSync(AGENTS_PATH, JSON.stringify(all, null, 2), { encoding: 'utf-8', mode: 0o600 });
    chmodSync(AGENTS_PATH, 0o600);
}
export function readAgent(appId) {
    return readAgents()[appId] ?? null;
}
export function listAgents() {
    return Object.values(readAgents());
}
export function removeAgent(appId) {
    ensureDir();
    const all = readAgents();
    delete all[appId];
    writeFileSync(AGENTS_PATH, JSON.stringify(all, null, 2), { encoding: 'utf-8', mode: 0o600 });
}
export function updateAgentPid(appId, pid) {
    const entry = readAgent(appId);
    if (!entry)
        return;
    saveAgent({ ...entry, pid });
}
/**
 * Bitta fizik mashina uchun BIR MARTA yaratiladigan barqaror identifikator.
 * `~/.screenctl/agents.json` (tokenlar) o'chirilib qolsa ham, `machine-id`
 * fayli saqlanib qoladi — shu orqali backend "bu qurilma allaqachon bor,
 * yangi App yaratma, eskisiga qayta ulanaver" deb bilib oladi.
 */
export function getOrCreateMachineId() {
    ensureDir();
    if (existsSync(MACHINE_ID_PATH)) {
        const existing = readFileSync(MACHINE_ID_PATH, 'utf-8').trim();
        if (existing)
            return existing;
    }
    let id;
    try {
        // Haqiqiy OS darajasidagi barqaror ID (Linux: /etc/machine-id,
        // macOS: IOPlatformUUID, Windows: registry GUID) — SHA-256 bilan
        // xeshlangan holda. Bu ~/.screenctl papkasi o'chirilib qolsa ham
        // (masalan home directory tozalansa) bir xil qiymatni beradi.
        id = machineIdSync(true);
    }
    catch {
        // Ba'zi konteyner/cheklangan muhitlarda o'qib bo'lmasligi mumkin —
        // shunday holatda ilgarigidek random UUID'ga tushamiz.
        id = randomUUID();
    }
    writeFileSync(MACHINE_ID_PATH, id, { encoding: 'utf-8', mode: 0o600 });
    return id;
}
