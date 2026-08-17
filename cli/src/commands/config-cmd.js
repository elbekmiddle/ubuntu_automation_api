const chalk = require('chalk');
const config = require('../config');
const { fail } = require('../ui');

const EDITABLE_KEYS = ['apiUrl'];

function configShowCommand() {
  const c = config.load();
  console.log(chalk.gray('Config file '), config.CONFIG_FILE);
  console.log();
  console.log(chalk.gray('API URL     '), c.apiUrl);
  console.log(chalk.gray('Authenticated'), c.accessToken ? chalk.green('yes') : chalk.gray('no'));
  if (c.email) console.log(chalk.gray('Email       '), c.email);
}

function configSetCommand(key, value) {
  if (key === 'api-url' || key === 'apiUrl') {
    const c = config.load();
    c.apiUrl = value;
    config.save(c);
    console.log(chalk.green('✓'), `apiUrl = ${value}`);
    return;
  }
  fail(`Noma'lum config kaliti: ${key}. Ruxsat etilganlar: ${EDITABLE_KEYS.join(', ')}`);
  process.exitCode = 1;
}

module.exports = { configShowCommand, configSetCommand };
