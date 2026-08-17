const chalk = require('chalk');

function banner() {
  console.log(chalk.cyan(String.raw`
 ███████╗ ██████╗██████╗ ███████╗███████╗███╗   ██╗ ██████╗████████╗██╗
 ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝████╗  ██║██╔════╝╚══██╔══╝██║
 ███████╗██║     ██████╔╝█████╗  █████╗  ██╔██╗ ██║██║        ██║   ██║
 ╚════██║██║     ██╔══██╗██╔══╝  ██╔══╝  ██║╚██╗██║██║        ██║   ██║
 ███████║╚██████╗██║  ██║███████╗███████╗██║ ╚████║╚██████╗   ██║   ███████╗
 ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚══════╝
`));
  console.log(chalk.gray('              SYSTEM AUTOMATION PLATFORM  ·  CLI v0.1.0\n'));
}

function ok(msg) {
  console.log(chalk.green('✓'), msg);
}
function fail(msg) {
  console.log(chalk.red('✗'), msg);
}
function info(msg) {
  console.log(chalk.cyan('›'), msg);
}
function dim(msg) {
  console.log(chalk.gray(msg));
}

function statusDot(status) {
  const colors = {
    online: chalk.green('●'),
    running: chalk.cyan('●'),
    success: chalk.green('●'),
    pending: chalk.gray('○'),
    failed: chalk.red('●'),
    offline: chalk.gray('○'),
  };
  return colors[status] || chalk.gray('○');
}

/** Oddiy jadval — cli-table3'siz, sozlanuvchan ustun kengligi bilan. */
function table(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)),
  );
  const line = (cells, colorFn = (s) => s) =>
    cells.map((c, i) => colorFn(String(c ?? '').padEnd(widths[i]))).join('  ');

  console.log(line(headers, chalk.gray));
  console.log(chalk.gray(widths.map((w) => '─'.repeat(w)).join('  ')));
  for (const row of rows) console.log(line(row));
}

module.exports = { banner, ok, fail, info, dim, statusDot, table };
