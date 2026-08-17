const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

const loginCommand = require('./commands/login');
const { logoutCommand, whoamiCommand } = require('./commands/session');
const {
  templatesListCommand,
  templatesPublicCommand,
  templatesShowCommand,
  templatesCreateCommand,
} = require('./commands/templates');
const {
  jobsListCommand,
  jobsShowCommand,
  jobsLogsCommand,
  jobsRunCommand,
  jobsCancelCommand,
} = require('./commands/jobs');
const { schedulesListCommand, devicesListCommand, auditListCommand } = require('./commands/misc');
const doctorCommand = require('./commands/doctor');
const { configShowCommand, configSetCommand } = require('./commands/config-cmd');
const shellCommand = require('./commands/shell');
const { fail } = require('./ui');
const { suggest } = require('./utils/suggest');

// NO_COLOR standarti — https://no-color.org
if (process.env.NO_COLOR) chalk.level = 0;

const program = new Command();

program
  .name('screenctl')
  .description('Screenctl — Ubuntu System Automation Platform CLI')
  .version(pkg.version, '-v, --version');

program.command('login').description('Screenctl akkountingizga kiring').action(loginCommand);
program.command('logout').description('Joriy sessiyadan chiqing').action(logoutCommand);
program.command('whoami').description('Joriy foydalanuvchi ma\'lumotini ko\'rsatadi').action(whoamiCommand);
program.command('shell').description('Interaktiv shell rejimini ochadi').action(shellCommand);
program.command('doctor').description('CLI/API/Auth holatini tekshiradi').action(doctorCommand);

const templates = program.command('templates').alias('template').description('Templatelarni boshqarish');
templates
  .command('list')
  .option('--json', 'JSON formatda chiqarish')
  .description('Barcha templatelarni ko\'rsatadi')
  .action(templatesListCommand);
templates
  .command('show <slug>')
  .option('--json', 'JSON formatda chiqarish')
  .description('Bitta template haqida to\'liq ma\'lumot')
  .action(templatesShowCommand);
templates
  .command('public [query]')
  .option('--json', 'JSON formatda chiqarish')
  .description('Jamoatchilikka ochiq (community) templatelarni qidiradi')
  .action(templatesPublicCommand);
templates
  .command('create')
  .description('Interaktiv ravishda yangi template yaratadi')
  .action(templatesCreateCommand);

const jobs = program.command('jobs').alias('job').description('Ishga tushirilgan job\'larni boshqarish');
jobs
  .command('list')
  .option('-l, --limit <n>', 'nechta job ko\'rsatish', '15')
  .option('--json', 'JSON formatda chiqarish')
  .description('So\'nggi job\'larni ko\'rsatadi')
  .action(jobsListCommand);
jobs
  .command('show <jobId>')
  .option('--json', 'JSON formatda chiqarish')
  .description('Job haqida to\'liq ma\'lumot')
  .action(jobsShowCommand);
jobs
  .command('logs <jobId>')
  .option('-f, --follow', 'job tugagunicha loglarni jonli kuzatish')
  .option('--json', 'JSON formatda chiqarish')
  .description('Job loglarini ko\'rsatadi')
  .action(jobsLogsCommand);
jobs
  .command('run <templateSlug> <action>')
  .option('-f, --follow', 'ishga tushirilgach loglarni jonli kuzatish')
  .option('--json', 'JSON formatda chiqarish')
  .description('Template action\'ini ishga tushiradi')
  .action(jobsRunCommand);
jobs.command('cancel <jobId>').description('Job\'ni bekor qiladi (hozircha qo\'llab-quvvatlanmaydi)').action(jobsCancelCommand);

const schedules = program.command('schedules').description('Rejalashtirilgan (cron) ishlarni boshqarish');
schedules.command('list').description('Barcha schedule\'larni ko\'rsatadi').action(schedulesListCommand);

const devices = program.command('devices').description('Ulangan qurilmalarni (IP) ko\'rish');
devices.command('list').description('Kuzatilgan qurilmalar ro\'yxati').action(devicesListCommand);

const audit = program.command('audit').description('Audit log yozuvlarini ko\'rish');
audit
  .command('list')
  .option('-l, --limit <n>', 'nechta yozuv ko\'rsatish', '20')
  .description('So\'nggi audit yozuvlarini ko\'rsatadi')
  .action(auditListCommand);

const configCmd = program.command('config').description('CLI konfiguratsiyasi');
configCmd.command('show').description('Joriy konfiguratsiyani ko\'rsatadi').action(configShowCommand);
configCmd.command('set <key> <value>').description('Konfiguratsiya qiymatini o\'zgartiradi (masalan: api-url)').action(configSetCommand);
// `screenctl config` argumentsiz chaqirilsa ham config'ni ko'rsatadi
configCmd.action(configShowCommand);

const KNOWN_COMMANDS = [
  'login', 'logout', 'whoami', 'shell', 'doctor',
  'templates', 'jobs', 'schedules', 'devices', 'audit', 'config', 'help',
];

program.on('command:*', (operands) => {
  const attempted = operands[0];
  const suggestion = suggest(attempted, KNOWN_COMMANDS);
  console.log();
  fail(`Unknown command: ${attempted}`);
  if (suggestion) {
    console.log();
    console.log(chalk.gray('Did you mean:'));
    console.log(`  ${chalk.cyan(suggestion)}`);
  }
  console.log();
  console.log(chalk.gray('Run `screenctl --help` for available commands.'));
  process.exitCode = 2;
});

if (process.argv.length <= 2) {
  // Argumentsiz chaqirilsa — interaktiv shell'ga o'tadi
  shellCommand();
} else {
  program.parseAsync(process.argv).catch((err) => {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  });
}
