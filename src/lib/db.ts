import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.ANTA_DATA_DIR ?? path.join(process.cwd(), "data");
export const REPORT_FILE_DIR = path.join(DATA_DIR, "reports");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker       TEXT,
  name         TEXT NOT NULL,
  market       TEXT,
  sector       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker) WHERE ticker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

CREATE TABLE IF NOT EXISTS analysts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  brokerage    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, brokerage)
);

CREATE TABLE IF NOT EXISTS reports (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analyst_id        INTEGER NOT NULL REFERENCES analysts(id) ON DELETE CASCADE,
  published_at      TEXT NOT NULL,
  title             TEXT NOT NULL,
  rating            TEXT,
  rating_raw        TEXT,
  prev_rating       TEXT,
  target_price      REAL,
  prev_target_price REAL,
  currency          TEXT DEFAULT 'KRW',
  tone_score        INTEGER,
  tone_label        TEXT,
  tone_rationale    TEXT,
  conviction        INTEGER,
  summary           TEXT,
  headline_message  TEXT,
  file_name         TEXT,
  file_hash         TEXT,
  stored_file       TEXT,
  extraction_model  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id, published_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_hash ON reports(file_hash) WHERE file_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS estimates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id      INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  fiscal_year    INTEGER NOT NULL,
  fiscal_quarter INTEGER,
  metric         TEXT NOT NULL,
  value          REAL NOT NULL,
  unit           TEXT NOT NULL,
  is_actual      INTEGER NOT NULL DEFAULT 0,
  note           TEXT
);
CREATE INDEX IF NOT EXISTS idx_estimates_report ON estimates(report_id);

CREATE TABLE IF NOT EXISTS investment_points (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,
  title      TEXT NOT NULL,
  detail     TEXT,
  category   TEXT,
  stance     TEXT,
  emphasis   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_points_report ON investment_points(report_id);

CREATE TABLE IF NOT EXISTS factors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id   INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  direction   TEXT,
  value_text  TEXT,
  commentary  TEXT
);
CREATE INDEX IF NOT EXISTS idx_factors_report ON factors(report_id);

CREATE TABLE IF NOT EXISTS risks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  text      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  quote     TEXT NOT NULL,
  context   TEXT
);

CREATE TABLE IF NOT EXISTS syntheses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  input_hash   TEXT NOT NULL,
  payload      TEXT NOT NULL,
  model        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_syntheses_company ON syntheses(company_id);
`;

let _db: Database.Database | null = null;

declare global {
  // eslint-disable-next-line no-var
  var __antaDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (_db) return _db;
  if (global.__antaDb) {
    _db = global.__antaDb;
    return _db;
  }
  fs.mkdirSync(REPORT_FILE_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "anta-wiki.db"));
  db.exec(SCHEMA);
  _db = db;
  if (process.env.NODE_ENV !== "production") global.__antaDb = db;
  return db;
}
