const chalk = require('chalk');
const config = require('../config');
const api = require('../api');

async function check(label, fn) {
  try {
    await fn();
    console.log(chalk.green('✓'), label);
    return true;
  } catch (err) {
    console.log(chalk.red('✕'), label);
    console.log(chalk.gray(`    ${err.message}`));
    return false;
  }
}

async function doctorCommand() {
  console.log(chalk.bold('Screenctl Doctor'));
  console.log();

  const { apiUrl, accessToken } = config.load();
  console.log(chalk.gray('API URL:'), apiUrl);
  console.log();

  const connectionOk = await check('API connection', async () => {
    const res = await fetch(`${apiUrl}/templates`, { method: 'GET' }).catch((e) => {
      throw new Error(`ulanib bo'lmadi (${e.message})`);
    });
    if (!res.ok && res.status !== 401 && res.status !== 429) {
      throw new Error(`kutilmagan status: ${res.status}`);
    }
  });

  let authOk = false;
  if (!accessToken) {
    console.log(chalk.yellow('⚠'), 'Authentication — login qilinmagan');
    console.log(chalk.gray('    Run: screenctl login'));
  } else {
    authOk = await check('Authentication', () => api.auth.me());
  }

  console.log();
  if (connectionOk && (authOk || !accessToken)) {
    console.log(chalk.bold.green('Everything looks good.'));
  } else {
    console.log(chalk.bold.red('Ba\'zi tekshiruvlar muvaffaqiyatsiz.'));
    process.exitCode = 1;
  }
}

module.exports = doctorCommand;
