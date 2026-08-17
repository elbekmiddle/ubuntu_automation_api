const readline = require('readline');
const chalk = require('chalk');
const config = require('../config');
const api = require('../api');
const { banner, info, fail } = require('../ui');
const { templatesListCommand, templatesPublicCommand } = require('./templates');
const { jobsListCommand } = require('./jobs');
const { schedulesListCommand, devicesListCommand, auditListCommand } = require('./misc');

const SHELL_COMMANDS = ['/help', '/apps', '/templates', '/public', '/jobs', '/schedules', '/devices', '/audit', '/status', '/clear', '/exit'];

function printHelp() {
  console.log(chalk.gray('Available commands:'));
  console.log('  /templates      - o\'z templatelaringiz');
  console.log('  /public [query] - jamoat templatelarini qidirish');
  console.log('  /jobs           - so\'nggi joblar');
  console.log('  /schedules      - rejalashtirilgan ishlar');
  console.log('  /devices        - kuzatilgan qurilmalar');
  console.log('  /audit          - audit log');
  console.log('  /status         - tizim holati');
  console.log('  /clear          - ekranni tozalash');
  console.log('  /exit           - chiqish');
}

async function printStatus() {
  const { apiUrl, accessToken, email } = config.load();
  console.log(chalk.gray('API:   '), apiUrl);
  console.log(chalk.gray('Auth:  '), accessToken ? chalk.green(`logged in as ${email ?? '?'}`) : chalk.gray('anonymous'));
  try {
    const sys = await api.system.overview();
    console.log(chalk.gray('CPU:   '), `${sys.cpu?.currentLoad?.toFixed?.(1) ?? '?'}%`);
    console.log(chalk.gray('Mem:   '), `${sys.memory?.ram?.usedPercent?.toFixed?.(1) ?? '?'}%`);
  } catch {
    console.log(chalk.gray('System:'), chalk.red('unavailable'));
  }
}

async function dispatch(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd) {
    case '/help':
      printHelp();
      break;
    case '/templates':
      await templatesListCommand({});
      break;
    case '/public':
      await templatesPublicCommand(arg, {});
      break;
    case '/jobs':
      await jobsListCommand({ limit: 10 });
      break;
    case '/schedules':
      await schedulesListCommand();
      break;
    case '/devices':
      await devicesListCommand();
      break;
    case '/audit':
      await auditListCommand({ limit: 10 });
      break;
    case '/status':
      await printStatus();
      break;
    case '/clear':
      console.clear();
      break;
    case '/exit':
    case '/quit':
      return false;
    default:
      fail(`Unknown command: ${cmd}`);
      console.log(chalk.gray('Type /help for available commands.'));
  }
  return true;
}

async function shellCommand() {
  banner();
  const { email, accessToken } = config.load();
  console.log(
    chalk.gray(
      accessToken ? `Logged in as: ${chalk.cyan(email ?? '?')}` : 'Not logged in — run `screenctl login` or /help for commands',
    ),
  );
  console.log(chalk.gray('Type /help for commands, /exit to quit.\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('screenctl › '),
    completer: (line) => {
      const hits = SHELL_COMMANDS.filter((c) => c.startsWith(line));
      return [hits.length ? hits : SHELL_COMMANDS, line];
    },
  });

  rl.prompt();
  let pending = Promise.resolve();
  rl.on('line', (line) => {
    pending = pending.then(async () => {
      if (line.trim()) {
        const shouldContinue = await dispatch(line);
        if (shouldContinue === false) {
          rl.close();
          return;
        }
      }
      rl.prompt();
    });
  });

  rl.on('close', async () => {
    await pending;
    console.log(chalk.gray('\nBye.'));
    process.exit(0);
  });
}

module.exports = shellCommand;
