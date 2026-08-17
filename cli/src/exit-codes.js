// CI/CD skriptlari uchun barqaror exit code'lar.
module.exports = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_COMMAND: 2,
  AUTH_ERROR: 3,
  PERMISSION_DENIED: 4,
  NETWORK_ERROR: 5,
  APP_OFFLINE: 6,
  JOB_FAILED: 7,
  TIMEOUT: 8,
};
