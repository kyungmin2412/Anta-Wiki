import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./db-schema";

const DATA_DIR = process.env.ANTA_DATA_DIR ?? path.join(process.cwd(), "data");
export const REPORT_FILE_DIR = path.join(DATA_DIR, "reports");

export type RunResult = { changes: number; lastInsertRowid: number | bigint };

export type Stmt = {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): RunResult;
};

/**
 * Node 내장 SQLite 위의 얇은 어댑터.
 *
 * 네이티브 모듈(better-sqlite3)을 쓰지 않는 이유: 윈도우에서 설치하려면
 * Visual Studio C++ 빌드 도구가 필요해, 개발자가 아닌 사용자는 시작조차 할 수 없다.
 * node:sqlite는 Node에 들어 있어 컴파일이 필요 없다.
 *
 * 어댑터가 하는 일은 두 가지다:
 *  - 조회 결과를 평범한 객체로 바꾼다 (node:sqlite는 프로토타입 없는 객체를 준다.
 *    그대로 두면 클라이언트 컴포넌트로 넘길 때 Next가 거부한다)
 *  - 트랜잭션을 함수로 감싼다
 */
export type Db = {
  prepare(sql: string): Stmt;
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
};

function wrap(raw: DatabaseSync): Db {
  return {
    exec: (sql) => raw.exec(sql),
    prepare(sql) {
      const stmt = raw.prepare(sql);
      return {
        all: (...p) => stmt.all(...(p as never[])).map((r) => ({ ...r })),
        get: (...p) => {
          const row = stmt.get(...(p as never[]));
          return row === undefined ? undefined : { ...row };
        },
        run: (...p) => stmt.run(...(p as never[])) as RunResult,
      };
    },
    transaction<T>(fn: () => T) {
      return () => {
        raw.exec("BEGIN");
        try {
          const out = fn();
          raw.exec("COMMIT");
          return out;
        } catch (err) {
          raw.exec("ROLLBACK");
          throw err;
        }
      };
    },
  };
}

let _db: Db | null = null;

declare global {
  var __antaDb: Db | undefined;
}

export function getDb(): Db {
  if (_db) return _db;
  if (global.__antaDb) {
    _db = global.__antaDb;
    return _db;
  }
  fs.mkdirSync(REPORT_FILE_DIR, { recursive: true });
  const raw = new DatabaseSync(path.join(DATA_DIR, "anta-wiki.db"));
  const db = wrap(raw);
  db.exec(SCHEMA);
  _db = db;
  if (process.env.NODE_ENV !== "production") global.__antaDb = db;
  return db;
}
