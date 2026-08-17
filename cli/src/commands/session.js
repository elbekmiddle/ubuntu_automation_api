const chalk = require('chalk');
const api = require('../api');
const config = require('../config');
const { ok, fail, info } = require('../ui');

async function logoutCommand() {
  const { refreshToken } = config.load();
  if (!refreshToken) {
    info('Siz allaqachon tizimdan chiqqansiz.');
    return;
  }
  try {
    await api.auth.logout(refreshToken);
  } catch {
    // Server tomonda xato bo'lsa ham local tokenlarni tozalaymiz
  }
  config.clearTokens();
  ok('Logged out');
}

async function whoamiCommand() {
  const { accessToken, apiUrl } = config.load();
  if (!accessToken) {
    fail('Siz login qilmagansiz. `screenctl login` buyrug\'ini ishlating.');
    process.exitCode = 1;
    return;
  }
  try {
    const me = await api.auth.me();
    console.log(chalk.gray('API:    '), apiUrl);
    console.log(chalk.gray('Email:  '), chalk.cyan(me.email));
    console.log(chalk.gray('Name:   '), me.name || chalk.gray('—'));
    console.log(chalk.gray('UserID: '), me.id);
  } catch (err) {
    fail(err.message);
    process.exitCode = 1;
  }
}

module.exports = { logoutCommand, whoamiCommand };
