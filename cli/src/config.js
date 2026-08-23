const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.screenctl');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  apiUrl: process.env.SCREENCTL_API_URL || 'https://screen-api.honeymedia.uz',
  accessToken: null,
  refreshToken: null,
  email: null,
};

// ESLATMA: bu oddiy fayl-asosli credential storage — Screenctl'ning to'liq
// versiyasida access/refresh tokenlar OS keyring (Secret Service / Keychain /
// Credential Manager) orqali saqlanishi kerak. Hozircha CLI faylni faqat
// egasi o'qiy oladigan (0600) qilib saqlaydi — bu minimal, lekin yetarli emas
// himoya darajasi.
function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function load() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS };
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function setTokens({ accessToken, refreshToken, email }) {
  const config = load();
  config.accessToken = accessToken ?? config.accessToken;
  config.refreshToken = refreshToken ?? config.refreshToken;
  if (email !== undefined) config.email = email;
  save(config);
}

function clearTokens() {
  const config = load();
  config.accessToken = null;
  config.refreshToken = null;
  config.email = null;
  save(config);
}

function getApiUrl() {
  return load().apiUrl;
}

module.exports = { CONFIG_FILE, load, save, setTokens, clearTokens, getApiUrl };
