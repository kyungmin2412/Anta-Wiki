import Database from "better-sqlite3";
import { SCHEMA } from "./db-schema";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.ANTA_DATA_DIR ?? path.join(process.cwd(), "data");
export const REPORT_FILE_DIR = path.join(DATA_DIR, "reports");


let _db: Database.Database | null = null;

declare global {
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
