/* eslint-disable */
/**
 * Initial schema — circuits, simulations, users, batches.
 *
 * Matches the tables the app previously created at boot; the app no longer
 * creates tables, so this migration owns the schema.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE circuits (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      num_qubits  INTEGER NOT NULL,
      operations  JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_circuits_user_created
      ON circuits (user_id, created_at DESC, id DESC);

    CREATE TABLE simulations (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      circuit_id        TEXT,
      circuit_name      TEXT NOT NULL,
      engine            TEXT NOT NULL,
      shots             INTEGER NOT NULL,
      num_qubits        INTEGER NOT NULL,
      status            TEXT NOT NULL,
      results           JSONB NOT NULL DEFAULT '{}'::jsonb,
      execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_simulations_user_created
      ON simulations (user_id, created_at DESC, id DESC);

    CREATE TABLE users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE batches (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      status      TEXT NOT NULL,
      total       INTEGER NOT NULL,
      succeeded   INTEGER NOT NULL,
      failed      INTEGER NOT NULL,
      entries     JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_batches_user_created
      ON batches (user_id, created_at DESC, id DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS batches;
    DROP TABLE IF EXISTS simulations;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS circuits;
  `);
};
