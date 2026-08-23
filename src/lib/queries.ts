import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import type { ReportExtraction, Synthesis } from "./schema";
import type {
  Analyst,
  Company,
  CompanySummary,
  Estimate,
  Factor,
  FullReport,
  InvestmentPoint,
  ReportRow,
} from "./types";

/* ------------------------------- 조회 ------------------------------- */

export function listCompanies(): CompanySummary[] {
  return getDb()
    .prepare(
      `SELECT c.*,
              COUNT(r.id)                    AS report_count,
              COUNT(DISTINCT r.analyst_id)   AS analyst_count,
              MAX(r.published_at)            AS latest_report_at,
              MIN(r.published_at)            AS first_report_at,
              ROUND(AVG(r.tone_score), 1)    AS avg_tone,
              (SELECT tone_score FROM reports r2
                WHERE r2.company_id = c.id
                ORDER BY r2.published_at DESC, r2.id DESC LIMIT 1) AS latest_tone
         FROM companies c
         LEFT JOIN reports r ON r.company_id = c.id
        GROUP BY c.id
        ORDER BY report_count DESC, c.name ASC`,
    )
    .all() as CompanySummary[];
}

export function getCompany(id: number): Company | null {
  return (getDb().prepare(`SELECT * FROM companies WHERE id = ?`).get(id) ??
    null) as Company | null;
}

export function getReportsForCompany(companyId: number): FullReport[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.*, a.name AS analyst_name, a.brokerage AS analyst_brokerage
         FROM reports r JOIN analysts a ON a.id = r.analyst_id
        WHERE r.company_id = ?
        ORDER BY r.published_at ASC, r.id ASC`,
    )
    .all(companyId) as (ReportRow & {
    analyst_name: string;
    analyst_brokerage: string;
  })[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const holes = ids.map(() => "?").join(",");
  const estimates = db
    .prepare(`SELECT * FROM estimates WHERE report_id IN (${holes})`)
    .all(...ids) as Estimate[];
  const points = db
    .prepare(
      `SELECT * FROM investment_points WHERE report_id IN (${holes}) ORDER BY seq`,
    )
    .all(...ids) as InvestmentPoint[];
  const factors = db
    .prepare(`SELECT * FROM factors WHERE report_id IN (${holes})`)
    .all(...ids) as Factor[];
  const risks = db
    .prepare(`SELECT report_id, text FROM risks WHERE report_id IN (${holes})`)
    .all(...ids) as { report_id: number; text: string }[];
  const quotes = db
    .prepare(
      `SELECT report_id, quote, context FROM quotes WHERE report_id IN (${holes})`,
    )
    .all(...ids) as { report_id: number; quote: string; context: string | null }[];

  const by = <T extends { report_id: number }>(arr: T[]) => {
    const m = new Map<number, T[]>();
    for (const x of arr) m.set(x.report_id, [...(m.get(x.report_id) ?? []), x]);
    return m;
  };
  const eM = by(estimates), pM = by(points), fM = by(factors);
  const rM = by(risks), qM = by(quotes);

  return rows.map((r) => ({
    ...r,
    analyst: {
      id: r.analyst_id,
      name: r.analyst_name,
      brokerage: r.analyst_brokerage,
    } satisfies Analyst,
    estimates: eM.get(r.id) ?? [],
    points: pM.get(r.id) ?? [],
    factors: fM.get(r.id) ?? [],
    risks: (rM.get(r.id) ?? []).map((x) => x.text),
    quotes: (qM.get(r.id) ?? []).map((x) => ({
      quote: x.quote,
      context: x.context,
    })),
  }));
}

export function getReport(reportId: number): FullReport | null {
  const row = getDb()
    .prepare(`SELECT company_id FROM reports WHERE id = ?`)
    .get(reportId) as { company_id: number } | undefined;
  if (!row) return null;
  return (
    getReportsForCompany(row.company_id).find((r) => r.id === reportId) ?? null
  );
}

export function findReportByHash(hash: string): { id: number; company_id: number } | null {
  return (getDb()
    .prepare(`SELECT id, company_id FROM reports WHERE file_hash = ?`)
    .get(hash) ?? null) as { id: number; company_id: number } | null;
}

/* ------------------------------- 저장 ------------------------------- */

function upsertCompany(x: ReportExtraction): number {
  const db = getDb();
  const ticker = x.company_ticker?.trim() || null;
  if (ticker) {
    const hit = db
      .prepare(`SELECT id FROM companies WHERE ticker = ?`)
      .get(ticker) as { id: number } | undefined;
    if (hit) return hit.id;
  }
  const byName = db
    .prepare(`SELECT id, ticker FROM companies WHERE name = ?`)
    .get(x.company_name) as { id: number; ticker: string | null } | undefined;
  if (byName) {
    // 종목코드가 나중에 확인된 경우 채워 넣는다.
    if (ticker && !byName.ticker) {
      db.prepare(`UPDATE companies SET ticker = ? WHERE id = ?`).run(
        ticker,
        byName.id,
      );
    }
    return byName.id;
  }
  return Number(
    db
      .prepare(
        `INSERT INTO companies (ticker, name, market, sector) VALUES (?, ?, ?, ?)`,
      )
      .run(ticker, x.company_name, x.market, x.sector).lastInsertRowid,
  );
}

function upsertAnalyst(name: string, brokerage: string): number {
  const db = getDb();
  const hit = db
    .prepare(`SELECT id FROM analysts WHERE name = ? AND brokerage = ?`)
    .get(name, brokerage) as { id: number } | undefined;
  if (hit) return hit.id;
  return Number(
    db
      .prepare(`INSERT INTO analysts (name, brokerage) VALUES (?, ?)`)
      .run(name, brokerage).lastInsertRowid,
  );
}

export function saveExtraction(
  x: ReportExtraction,
  meta: { fileName: string; fileHash: string; storedFile: string; model: string },
): { reportId: number; companyId: number } {
  const db = getDb();
  const run = db.transaction(() => {
    const companyId = upsertCompany(x);
    const analystId = upsertAnalyst(
      x.analyst_name.trim() || "미상",
      x.brokerage.trim() || "미상",
    );

    const reportId = Number(
      db
        .prepare(
          `INSERT INTO reports (company_id, analyst_id, published_at, title, rating, rating_raw,
             prev_rating, target_price, prev_target_price, currency, tone_score, tone_label,
             tone_rationale, conviction, summary, headline_message, file_name, file_hash,
             stored_file, extraction_model)
           VALUES (@company_id, @analyst_id, @published_at, @title, @rating, @rating_raw,
             @prev_rating, @target_price, @prev_target_price, @currency, @tone_score, @tone_label,
             @tone_rationale, @conviction, @summary, @headline_message, @file_name, @file_hash,
             @stored_file, @model)`,
        )
        .run({
          company_id: companyId,
          analyst_id: analystId,
          published_at: x.published_at,
          title: x.title,
          rating: x.rating,
          rating_raw: x.rating_raw,
          prev_rating: x.prev_rating,
          target_price: x.target_price,
          prev_target_price: x.prev_target_price,
          currency: x.currency,
          tone_score: x.tone_score,
          tone_label: x.tone_label,
          tone_rationale: x.tone_rationale,
          conviction: x.conviction,
          summary: x.summary,
          headline_message: x.headline_message,
          file_name: meta.fileName,
          file_hash: meta.fileHash,
          stored_file: meta.storedFile,
          model: meta.model,
        }).lastInsertRowid,
    );

    const est = db.prepare(
      `INSERT INTO estimates (report_id, fiscal_year, fiscal_quarter, metric, value, unit, is_actual, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const e of x.estimates) {
      est.run(
        reportId,
        e.fiscal_year,
        e.fiscal_quarter,
        e.metric,
        e.value,
        e.unit,
        e.is_actual ? 1 : 0,
        e.note,
      );
    }

    const pt = db.prepare(
      `INSERT INTO investment_points (report_id, seq, title, detail, category, stance, emphasis)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    x.investment_points.forEach((p, i) =>
      pt.run(reportId, i, p.title, p.detail, p.category, p.stance, p.emphasis),
    );

    const fc = db.prepare(
      `INSERT INTO factors (report_id, name, category, direction, value_text, commentary)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const f of x.factors) {
      fc.run(reportId, f.name, f.category, f.direction, f.value_text, f.commentary);
    }

    const rk = db.prepare(`INSERT INTO risks (report_id, text) VALUES (?, ?)`);
    for (const r of x.risks) rk.run(reportId, r);

    const qt = db.prepare(
      `INSERT INTO quotes (report_id, quote, context) VALUES (?, ?, ?)`,
    );
    for (const q of x.quotes) qt.run(reportId, q.quote, q.context);

    // 리포트가 추가되면 기존 종합 분석은 낡은 것이 된다.
    db.prepare(`DELETE FROM syntheses WHERE company_id = ?`).run(companyId);

    return { reportId, companyId };
  });
  return run();
}

export function deleteReport(reportId: number): number | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT company_id FROM reports WHERE id = ?`)
    .get(reportId) as { company_id: number } | undefined;
  if (!row) return null;
  db.transaction(() => {
    db.prepare(`DELETE FROM reports WHERE id = ?`).run(reportId);
    db.prepare(`DELETE FROM syntheses WHERE company_id = ?`).run(row.company_id);
  })();
  return row.company_id;
}

/* ---------------------------- 종합 분석 캐시 ---------------------------- */

/** 리포트 구성이 바뀌면 캐시가 무효화되도록 입력 지문을 만든다. */
export function synthesisInputHash(reports: FullReport[]): string {
  const seed = reports
    .map((r) => `${r.id}:${r.published_at}:${r.tone_score}`)
    .join("|");
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

export function getSynthesis(
  companyId: number,
): { payload: Synthesis; input_hash: string; created_at: string } | null {
  const row = getDb()
    .prepare(`SELECT payload, input_hash, created_at FROM syntheses WHERE company_id = ?`)
    .get(companyId) as
    | { payload: string; input_hash: string; created_at: string }
    | undefined;
  if (!row) return null;
  return {
    payload: JSON.parse(row.payload) as Synthesis,
    input_hash: row.input_hash,
    created_at: row.created_at,
  };
}

export function saveSynthesis(
  companyId: number,
  inputHash: string,
  payload: Synthesis,
  model: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO syntheses (company_id, input_hash, payload, model, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(company_id) DO UPDATE SET
         input_hash = excluded.input_hash,
         payload    = excluded.payload,
         model      = excluded.model,
         created_at = excluded.created_at`,
    )
    .run(companyId, inputHash, JSON.stringify(payload), model);
}
