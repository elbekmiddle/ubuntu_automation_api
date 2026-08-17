const chalk = require('chalk');
const api = require('../api');
const EXIT = require('../exit-codes');
const { table, fail, info, statusDot } = require('../ui');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jobsListCommand(opts) {
  try {
    const res = await api.jobs.list(1, Number(opts.limit) || 15);
    const jobs = res.data ?? res;
    if (opts.json) {
      console.log(JSON.stringify(jobs, null, 2));
      return;
    }
    if (!jobs.length) {
      info('Hozircha job yo\'q.');
      return;
    }
    table(
      ['ID', 'ACTION', 'STATUS', 'CREATED'],
      jobs.map((j) => [
        j.id.slice(0, 8),
        j.action,
        `${statusDot(j.status)} ${j.status}`,
        new Date(j.created_at).toLocaleString(),
      ]),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function jobsShowCommand(jobId, opts) {
  try {
    const j = await api.jobs.get(jobId);
    if (opts.json) {
      console.log(JSON.stringify(j, null, 2));
      return;
    }
    console.log(chalk.bold(`Job ${j.id}`));
    console.log();
    console.log(chalk.gray('Status    '), `${statusDot(j.status)} ${j.status}`);
    console.log(chalk.gray('Action    '), j.action);
    console.log(chalk.gray('Started   '), j.started_at ? new Date(j.started_at).toLocaleString() : '—');
    console.log(chalk.gray('Finished  '), j.finished_at ? new Date(j.finished_at).toLocaleString() : '—');
    console.log(chalk.gray('Exit code '), j.exit_code ?? '—');
    if (j.status === 'failed') process.exitCode = EXIT.JOB_FAILED;
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function printLogs(jobId, sinceIndex = 0) {
  const logs = await api.jobs.logs(jobId);
  for (let i = sinceIndex; i < logs.length; i++) {
    const l = logs[i];
    const prefix = l.stream === 'stderr' ? chalk.red('[err]') : chalk.gray('[out]');
    process.stdout.write(`${prefix} ${l.chunk}`);
  }
  return logs.length;
}

async function jobsLogsCommand(jobId, opts) {
  try {
    if (!opts.follow) {
      const logs = await api.jobs.logs(jobId);
      if (opts.json) {
        console.log(JSON.stringify(logs, null, 2));
        return;
      }
      if (!logs.length) {
        info('Bu job uchun hali log yo\'q.');
        return;
      }
      await printLogs(jobId);
      return;
    }

    // --follow: job tugagunicha (yoki Ctrl+C bosilgunicha) taxminan 1.5s'da bir marta yangi log qatorlarini chiqaradi
    let cursor = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      cursor = await printLogs(jobId, cursor);
      const job = await api.jobs.get(jobId);
      if (job.status === 'success' || job.status === 'failed') {
        cursor = await printLogs(jobId, cursor);
        console.log();
        if (job.status === 'failed') {
          fail(`Job failed (exit code ${job.exit_code ?? '?'})`);
          process.exitCode = EXIT.JOB_FAILED;
        } else {
          console.log(chalk.green('✓'), 'Completed');
        }
        return;
      }
      await sleep(1500);
    }
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function jobsRunCommand(templateSlug, action, opts) {
  try {
    const job = await api.jobs.create(templateSlug, action);
    if (opts.json) {
      console.log(JSON.stringify(job, null, 2));
      return;
    }
    info(`Job yaratildi: ${chalk.cyan(job.id)}`);
    if (opts.follow) {
      await jobsLogsCommand(job.id, { follow: true });
    } else {
      console.log(chalk.gray(`  screenctl jobs logs ${job.id} --follow`));
    }
  } catch (err) {
    fail(err.message);
    process.exitCode = err.exitCode ?? 1;
  }
}

async function jobsCancelCommand(jobId) {
  // Backend hozircha job'ni bekor qilishni (process kill) qo'llab-quvvatlamaydi —
  // bu Agent qatlami qo'shilgach amalga oshiriladi.
  fail('Job cancel hali qo\'llab-quvvatlanmaydi (Agent execution layer kerak).');
  process.exitCode = EXIT.GENERAL_ERROR;
}

module.exports = { jobsListCommand, jobsShowCommand, jobsLogsCommand, jobsRunCommand, jobsCancelCommand };
