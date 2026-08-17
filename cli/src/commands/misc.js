const chalk = require('chalk');
const api = require('../api');
const { table, fail, info } = require('../ui');

async function schedulesListCommand() {
  try {
    const schedules = await api.schedules.list();
    if (!schedules.length) {
      info('Rejalashtirilgan ish yo\'q.');
      return;
    }
    table(
      ['ID', 'TEMPLATE', 'ACTION', 'CRON', 'ENABLED', 'LAST RUN'],
      schedules.map((s) => [
        s.id.slice(0, 8),
        s.template_slug ?? s.template_id,
        s.action,
        s.cron,
        s.enabled ? chalk.green('yes') : chalk.gray('no'),
        s.last_run_at ? new Date(s.last_run_at).toLocaleString() : '—',
      ]),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = 1;
  }
}

async function devicesListCommand() {
  try {
    const devices = await api.devices.list();
    if (!devices.length) {
      info('Qurilma topilmadi.');
      return;
    }
    table(
      ['IP', 'LABEL', 'REQUESTS', 'LAST SEEN'],
      devices.map((d) => [d.ip, d.label ?? chalk.gray('—'), d.request_count, new Date(d.last_seen).toLocaleString()]),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = 1;
  }
}

async function auditListCommand(opts) {
  try {
    const logs = await api.auditLogs.list(Number(opts.limit) || 20);
    const rows = logs.data ?? logs;
    if (!rows.length) {
      info('Audit yozuvi yo\'q.');
      return;
    }
    table(
      ['TIME', 'ACTION', 'RESOURCE', 'IP'],
      rows.map((l) => [
        new Date(l.created_at).toLocaleString(),
        l.action,
        `${l.resource_type ?? ''}${l.resource_id ? ':' + String(l.resource_id).slice(0, 8) : ''}`,
        l.ip ?? '—',
      ]),
    );
  } catch (err) {
    fail(err.message);
    process.exitCode = 1;
  }
}

module.exports = { schedulesListCommand, devicesListCommand, auditListCommand };
