const chalk = require('chalk');
const readline = require('readline');
const api = require('../api');
const { table, fail, info, ok } = require('../ui');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function templatesListCommand(opts) {
  try {
    const templates = await api.templates.list();
    if (opts.json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }
    if (templates.length === 0) {
      info('Templates topilmadi.');
      return;
    }
    table(
      ['SLUG', 'NAME', 'ACTIONS', 'VISIBILITY'],
      templates.map((t) => [
        t.slug,
        t.name,
        t.actions.join(', '),
        t.is_public ? chalk.cyan('public') : chalk.gray('private'),
      ]),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function templatesPublicCommand(query, opts) {
  try {
    const templates = await api.templates.public(query);
    if (opts.json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }
    if (templates.length === 0) {
      info('Hech qanday public template topilmadi.');
      return;
    }
    table(
      ['SLUG', 'NAME', 'DESCRIPTION'],
      templates.map((t) => [t.slug, t.name, t.description || '']),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function templatesShowCommand(slug, opts) {
  try {
    const templates = await api.templates.list();
    const t = templates.find((x) => x.slug === slug || x.id === slug);
    if (!t) {
      fail(`Template topilmadi: ${slug}`);
      process.exitCode = 1;
      return;
    }
    if (opts.json) {
      console.log(JSON.stringify(t, null, 2));
      return;
    }
    console.log(chalk.bold(t.name));
    console.log();
    console.log(chalk.gray('Slug         '), t.slug);
    console.log(chalk.gray('Description  '), t.description || chalk.gray('—'));
    console.log(chalk.gray('Visibility   '), t.is_public ? chalk.cyan('public') : chalk.gray('private'));
    console.log();
    console.log(chalk.gray('Actions'));
    t.actions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

/** `screenctl templates create` — interaktiv ravishda yangi template yaratadi. */
async function templatesCreateCommand() {
  console.log(chalk.bold('Create template'));
  console.log();

  let slug = '';
  while (!SLUG_RE.test(slug)) {
    slug = await ask(chalk.gray('Slug (masalan: nginx-restart): '));
    if (!SLUG_RE.test(slug)) {
      fail('Slug faqat kichik harf, raqam va tire (-) bo\'lishi mumkin');
    }
  }

  const name = await ask(chalk.gray('Name: '));
  const description = await ask(chalk.gray('Description (ixtiyoriy): '));
  const isPublicAns = (await ask(chalk.gray('Public qilishni xohlaysizmi? [y/N]: '))).toLowerCase();
  const isPublic = isPublicAns === 'y' || isPublicAns === 'yes';

  const actions = [];
  console.log();
  console.log(chalk.gray('Endi action(lar)ni qo\'shamiz. Bo\'sh nom kiritsangiz tugaydi.'));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const actionName = await ask(chalk.gray(`Action #${actions.length + 1} nomi (bo'sh = tugatish): `));
    if (!actionName) break;
    if (!SLUG_RE.test(actionName)) {
      fail('Action nomi faqat kichik harf, raqam va tire (-) bo\'lishi mumkin');
      continue;
    }
    console.log(chalk.gray('Bash script kiriting. Tugatish uchun bo\'sh qatorda EOF yozing:'));
    const lines = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = await ask('');
      if (line === 'EOF') break;
      lines.push(line);
    }
    actions.push({ name: actionName, script: lines.join('\n') || '#!/bin/bash\necho "TODO"' });
  }

  if (actions.length === 0) {
    fail('Kamida bitta action kerak. Bekor qilindi.');
    process.exitCode = 1;
    return;
  }

  info('Yaratilmoqda...');
  try {
    const created = await api.templates.create({ slug, name, description, actions, isPublic });
    ok(`Template yaratildi: ${chalk.cyan(created.slug)}`);
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

module.exports = {
  templatesListCommand,
  templatesPublicCommand,
  templatesShowCommand,
  templatesCreateCommand,
};
