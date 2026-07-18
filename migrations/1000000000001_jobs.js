/* eslint-disable */
/**
 * Jobs table — asynchronous job engine.
 *
 * Backs the PostgresJobsRepository. Jobs are created `queued`, transition to
 * `running`, and settle in a terminal state (`completed`/`failed`/`cancelled`).
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE jobs (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      type         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'queued',
      progress     DOUBLE PRECISION NOT NULL DEFAULT 0,
      payload      JSONB NOT NULL,
      result       JSONB,
      error        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at   TIMESTAMPTZ,
      finished_at  TIMESTAMPTZ
    );
    CREATE INDEX idx_jobs_user_created
      ON jobs (user_id, created_at DESC, id DESC);
    CREATE INDEX idx_jobs_status
      ON jobs (status);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS jobs;`);
};
