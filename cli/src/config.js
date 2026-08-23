const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.screenctl');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  apiUrl:
      process.env.SCREENCTL_API_URL ||
      'https://screen-api.honeymedia.uz',

  apiKey:
      process.env.SCREENCTL_API_KEY ||
      null,

  accessToken: null,
  refreshToken: null,
  email: null,
};

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {
      recursive: true,
      mode: 0o700,
    });
  }
}

function load() {
  ensureDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULTS };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');

    return {
      ...DEFAULTS,
      ...JSON.parse(raw),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  ensureDir();

  fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      {
        mode: 0o600,
      },
  );

  // Fayl oldindan mavjud bo'lsa ham permissionni majburan 0600 qilamiz.
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {}
}

function setTokens({ accessToken, refreshToken, email }) {
  const config = load();

  config.accessToken =
      accessToken ?? config.accessToken;

  config.refreshToken =
      refreshToken ?? config.refreshToken;

  if (email !== undefined) {
    config.email = email;
  }

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

function getApiKey() {
  return load().apiKey;
}

module.exports = {
  CONFIG_FILE,
  load,
  save,
  setTokens,
  clearTokens,
  getApiUrl,
  getApiKey,
};