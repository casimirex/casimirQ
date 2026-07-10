/**
 * Jest global setup.
 *
 * When TEST_DATABASE_URL is set (the Postgres integration tests), apply
 * migrations once before the suite runs so the schema exists.
 */
const { execSync } = require('child_process');

module.exports = async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync('npx node-pg-migrate up', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
};
