import { periodKey } from "./domain";
import type { ReportExtraction } from "./schema";

/**
 * 모델 출력은 스키마를 지키지만 '내용'까지 정합한 건 아니다.
 * 실제 리포트에서 흔히 깨지는 지점만 골라 정리하고, 사람이 확인해야 할 것은 경고로 돌려준다.
 */
export type Sanitized = {
  value: ReportExtraction;
  warnings: string[];
};

const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(\d{4})-(\d{2})-(\d{2})$/, (m) => `${m[1]}-${m[2]}-${m[3]}`],
  [/^(\d{4})[.\/](\d{1,2})[.\/](\d{1,2})$/, (m) => iso(m[1], m[2], m[3])],
  [/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/, (m) => iso(m[1], m[2], m[3])],
  [/^(\d{4})(\d{2})(\d{2})$/, (m) => iso(m[1], m[2], m[3])],
  // 일자가 없으면 그 달 1일로 둔다 — 월 단위 정렬은 유지된다.
  [/^(\d{4})[-.\/](\d{1,2})$/, (m) => iso(m[1], m[2], "1")],
  [/^(\d{4})년\s*(\d{1,2})월$/, (m) => iso(m[1], m[2], "1")],
];

function iso(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function normalizeDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  for (const [re, build] of DATE_PATTERNS) {
    const m = s.match(re);
    if (!m) continue;
    const out = build(m);
    // 2월 30일 같은 값을 걸러낸다.
    const d = new Date(`${out}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || !d.toISOString().startsWith(out)) return null;
    return out;
  }
  return null;
}

/** A005930, 005930.KS, KRX:005930 → 005930 */
export function normalizeTicker(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase().replace(/^(KRX|KOSPI|KOSDAQ|KS|KQ)[:\s]+/, "");
  const kr = s.match(/^A?(\d{6})(?:\.[A-Z]{2})?$/);
  if (kr) return kr[1];
  const us = s.match(/^([A-Z]{1,5})(?:\.[A-Z]{1,2})?$/);
  if (us) return us[1];
  return s || null;
}

/** 화면에 쓸 기업명. "삼성전자(005930)", "(주)삼성전자" → "삼성전자" */
export function cleanCompanyName(raw: string): string {
  return (raw ?? "")
    .replace(/\((?:A?\d{6}|[A-Z]{1,5})(?:\.[A-Z]{1,2})?\)/g, "")
    .replace(/\(주\)|주식회사/g, "")
    .trim();
}

/**
 * 기업 동일성 판정용 키. 종목코드가 없는 리포트끼리도
 * "SK하이닉스"와 "SK 하이닉스"가 갈라지지 않도록 표기 흔들림을 지운다.
 */
export function companyMatchKey(raw: string): string {
  return cleanCompanyName(raw)
    .toLowerCase()
    .replace(/[\s·・.,\-_'"]/g, "");
}

/** "김도현 연구원", "김도현 수석" → "김도현" */
export function normalizeAnalyst(raw: string): string {
  const s = (raw ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*(연구원|애널리스트|수석|선임|책임|위원|팀장|이사|파트장|Analyst)\s*$/i, "")
    .trim();
  return s || "미상";
}

/** "(주)미래에셋증권", "미래에셋증권 리서치센터" → "미래에셋증권" */
export function normalizeBrokerage(raw: string): string {
  const s = (raw ?? "")
    .replace(/\(주\)|주식회사/g, "")
    .replace(/\s*(리서치센터|리서치본부|리서치|Research)\s*$/i, "")
    .trim();
  return s || "미상";
}

/**
 * 같은 (지표 × 결산기)가 한 리포트에서 두 번 나오면 시계열이 어느 값을 쓸지 모호해진다.
 * 뒤에 나온 값(대개 본문 정정치)을 남긴다.
 */
function dedupeEstimates(x: ReportExtraction): {
  estimates: ReportExtraction["estimates"];
  dropped: number;
} {
  const seen = new Map<string, number>();
  for (const [i, e] of x.estimates.entries()) {
    seen.set(`${e.metric}|${periodKey(e.fiscal_year, e.fiscal_quarter)}`, i);
  }
  const keep = new Set(seen.values());
  return {
    estimates: x.estimates.filter((_, i) => keep.has(i)),
    dropped: x.estimates.length - keep.size,
  };
}

/** 결산 연도가 상식 범위를 벗어나면 잘못 읽은 표다. */
function plausibleYear(y: number): boolean {
  const now = new Date().getUTCFullYear();
  return y >= now - 15 && y <= now + 10;
}

export function sanitizeExtraction(
  x: ReportExtraction,
  opts: { fallbackDate: string },
): Sanitized {
  const warnings: string[] = [];

  const date = normalizeDate(x.published_at);
  if (!date) {
    warnings.push(
      `발간일을 읽지 못했습니다(원문 표기: "${x.published_at}"). 업로드일로 대체했으니 확인이 필요합니다.`,
    );
  }

  const analyst = normalizeAnalyst(x.analyst_name);
  const brokerage = normalizeBrokerage(x.brokerage);
  if (analyst === "미상" || brokerage === "미상") {
    warnings.push("애널리스트 또는 증권사를 식별하지 못했습니다.");
  }

  const { estimates: deduped, dropped } = dedupeEstimates(x);
  if (dropped > 0) {
    warnings.push(`같은 결산기 추정치가 ${dropped}건 중복되어 마지막 값만 남겼습니다.`);
  }

  const estimates = deduped.filter((e) => plausibleYear(e.fiscal_year));
  const badYears = deduped.length - estimates.length;
  if (badYears > 0) {
    warnings.push(`결산 연도가 비정상인 추정치 ${badYears}건을 제외했습니다.`);
  }

  if (estimates.length === 0) {
    warnings.push("실적 추정치를 하나도 추출하지 못했습니다. 표가 이미지인지 확인해 보세요.");
  }
  if (x.investment_points.length === 0) {
    warnings.push("투자포인트를 추출하지 못했습니다.");
  }

  return {
    value: {
      ...x,
      published_at: date ?? opts.fallbackDate,
      analyst_name: analyst,
      brokerage,
      company_name: cleanCompanyName(x.company_name) || x.company_name.trim(),
      company_ticker: normalizeTicker(x.company_ticker),
      estimates,
    },
    warnings,
  };
}
