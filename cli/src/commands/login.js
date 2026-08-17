const readline = require('readline');
const chalk = require('chalk');
const api = require('../api');
const config = require('../config');
const { banner, ok, fail, info } = require('../ui');

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Parolni terminalga ko'rsatmasdan o'qish
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(value);
      } else if (char === '\u0003') {
        process.exit(1);
      } else if (char === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function loginCommand() {
  banner();
  console.log(chalk.bold('Login'));
  console.log();

  const email = await prompt(chalk.gray('Email:    '));
  const password = await prompt(chalk.gray('Password: '), { hidden: true });

  info('Authenticating...');
  try {
    const { user, tokens } = await api.auth.login(email, password);
    config.setTokens({ ...tokens, email: user.email });
    console.log();
    ok(`Successfully logged in as ${chalk.cyan(user.email)}`);
  } catch (err) {
    console.log();
    fail(err.message);
    process.exitCode = 1;
  }
}

module.exports = loginCommand;
