import {
  HIGHER_IS_BETTER,
  METRIC_PRIORITY,
  RATING_SCORE,
  periodKey,
  periodLabel,
  type Metric,
  type Unit,
} from "./domain";
import type { FullReport } from "./types";

export type AnalystKey = string;

/** 애널리스트 식별자. 동명이인이 있어도 증권사로 구분된다. */
export function analystKey(r: FullReport): AnalystKey {
  return `${r.analyst.name} (${r.analyst.brokerage})`;
}

/**
 * 색상은 등수가 아니라 개체를 따라간다 — 필터로 계열이 줄어도
 * 남은 애널리스트의 색이 바뀌지 않도록 회사 단위의 고정 순서를 만든다.
 * 순서 기준: 첫 리포트 발간일, 동률이면 이름.
 */
export function stableAnalysts(reports: FullReport[]): AnalystKey[] {
  const first = new Map<AnalystKey, string>();
  for (const r of reports) {
    const k = analystKey(r);
    const cur = first.get(k);
    if (!cur || r.published_at < cur) first.set(k, r.published_at);
  }
  return [...first.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}

/* ----------------------------- 논조 시계열 ----------------------------- */

export type TonePoint = {
  date: string;
  label: string;
  consensus: number | null;
} & Record<string, number | string | null>;

export function buildToneSeries(reports: FullReport[]): TonePoint[] {
  const dates = [...new Set(reports.map((r) => r.published_at))].sort();
  const latest = new Map<AnalystKey, number>();
  return dates.map((date) => {
    const row: TonePoint = { date, label: shortDate(date), consensus: null };
    for (const r of reports.filter((x) => x.published_at === date)) {
      if (r.tone_score == null) continue;
      row[analystKey(r)] = r.tone_score;
      latest.set(analystKey(r), r.tone_score);
    }
    const vals = [...latest.values()];
    row.consensus = vals.length ? round(mean(vals), 1) : null;
    return row;
  });
}

/* ---------------------------- 목표주가 시계열 ---------------------------- */

export function buildTargetPriceSeries(reports: FullReport[]): TonePoint[] {
  const dates = [...new Set(reports.map((r) => r.published_at))].sort();
  const latest = new Map<AnalystKey, number>();
  return dates.map((date) => {
    const row: TonePoint = { date, label: shortDate(date), consensus: null };
    for (const r of reports.filter((x) => x.published_at === date)) {
      if (r.target_price == null) continue;
      row[analystKey(r)] = r.target_price;
      latest.set(analystKey(r), r.target_price);
    }
    const vals = [...latest.values()];
    row.consensus = vals.length ? round(mean(vals), 0) : null;
    return row;
  });
}

/* ---------------------------- 추정치 시계열 ---------------------------- */

export type EstimateTrack = {
  metric: Metric;
  period: string;
  periodText: string;
  unit: Unit;
  /** 이 조합에 값이 있는 리포트 수 — 많을수록 비교 가치가 크다. */
  coverage: number;
  analysts: number;
};

/** (지표 × 결산기) 조합 중 시계열 비교가 가능한 것들을 굵은 순서로 나열. */
export function listEstimateTracks(reports: FullReport[]): EstimateTrack[] {
  const acc = new Map<
    string,
    EstimateTrack & { analystSet: Set<string> }
  >();
  for (const r of reports) {
    for (const e of r.estimates) {
      const period = periodKey(e.fiscal_year, e.fiscal_quarter);
      const id = `${e.metric}|${period}`;
      const cur =
        acc.get(id) ??
        {
          metric: e.metric,
          period,
          periodText: periodLabel(e.fiscal_year, e.fiscal_quarter),
          unit: e.unit,
          coverage: 0,
          analysts: 0,
          analystSet: new Set<string>(),
        };
      cur.coverage += 1;
      cur.analystSet.add(analystKey(r));
      acc.set(id, cur);
    }
  }
  return [...acc.values()]
    .map((t) => ({ ...t, analysts: t.analystSet.size }))
    .sort(
      (a, b) =>
        b.coverage - a.coverage ||
        a.period.localeCompare(b.period) ||
        METRIC_PRIORITY.indexOf(a.metric) - METRIC_PRIORITY.indexOf(b.metric),
    )
    .map(({ metric, period, periodText, unit, coverage, analysts }) => ({
      metric,
      period,
      periodText,
      unit,
      coverage,
      analysts,
    }));
}

export type EstimateSeries = {
  rows: TonePoint[];
  unit: Unit | null;
  analysts: AnalystKey[];
};

/**
 * 발간일을 x축으로, 애널리스트별 추정치를 계열로 만든다.
 * consensus는 "각 시점에 살아 있는 최신 추정치들의 평균"이라
 * 리포트가 드문드문 나와도 컨센서스 궤적이 끊기지 않는다.
 */
export function buildEstimateSeries(
  reports: FullReport[],
  metric: Metric,
  period: string,
): EstimateSeries {
  const pick = (r: FullReport) =>
    r.estimates.find(
      (e) => e.metric === metric && periodKey(e.fiscal_year, e.fiscal_quarter) === period,
    );

  const relevant = reports.filter((r) => pick(r));
  if (relevant.length === 0) return { rows: [], unit: null, analysts: [] };

  const analysts = stableAnalysts(relevant);
  const unit = pick(relevant[0])!.unit;
  const dates = [...new Set(relevant.map((r) => r.published_at))].sort();
  const latest = new Map<AnalystKey, number>();

  const rows = dates.map((date) => {
    const row: TonePoint = { date, label: shortDate(date), consensus: null };
    for (const r of relevant.filter((x) => x.published_at === date)) {
      const v = pick(r)!.value;
      row[analystKey(r)] = v;
      latest.set(analystKey(r), v);
    }
    const vals = [...latest.values()];
    row.consensus = vals.length ? round(mean(vals), 1) : null;
    return row;
  });

  return { rows, unit, analysts };
}

/* -------------------------- 애널리스트별 변화표 -------------------------- */

export type MetricRevision = {
  metric: Metric;
  period: string;
  periodText: string;
  unit: Unit;
  first: number;
  previous: number | null;
  latest: number;
  changeFromFirst: number | null;
  changeFromPrev: number | null;
  /** 상향/하향/유지 — 값이 클수록 좋은 지표에 한해 판정. */
  verdict: "상향" | "하향" | "유지" | null;
  observations: number;
};

export type AnalystRevision = {
  key: AnalystKey;
  name: string;
  brokerage: string;
  reportCount: number;
  firstDate: string;
  latestDate: string;
  latestTitle: string;
  latestReportId: number;
  firstTone: number | null;
  latestTone: number | null;
  toneDelta: number | null;
  latestRating: string | null;
  ratingDelta: number | null;
  firstTargetPrice: number | null;
  latestTargetPrice: number | null;
  targetPriceDelta: number | null;
  currency: string;
  revisions: MetricRevision[];
};

export function buildAnalystRevisions(
  reports: FullReport[],
  tracks: EstimateTrack[],
): AnalystRevision[] {
  const groups = new Map<AnalystKey, FullReport[]>();
  for (const r of reports) {
    const k = analystKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  const order = stableAnalysts(reports);
  return order.map((key) => {
    const rs = [...groups.get(key)!].sort((a, b) =>
      a.published_at.localeCompare(b.published_at),
    );
    const first = rs[0];
    const last = rs[rs.length - 1];

    const revisions: MetricRevision[] = [];
    for (const t of tracks) {
      const series = rs
        .map((r) => ({
          date: r.published_at,
          e: r.estimates.find(
            (e) =>
              e.metric === t.metric &&
              periodKey(e.fiscal_year, e.fiscal_quarter) === t.period,
          ),
        }))
        .filter((x) => x.e)
        .map((x) => ({ date: x.date, value: x.e!.value, unit: x.e!.unit }));
      if (series.length === 0) continue;

      const f = series[0];
      const l = series[series.length - 1];
      const p = series.length >= 2 ? series[series.length - 2] : null;
      const better = HIGHER_IS_BETTER[t.metric];
      const diff = l.value - (p?.value ?? f.value);
      revisions.push({
        metric: t.metric,
        period: t.period,
        periodText: t.periodText,
        unit: l.unit,
        first: f.value,
        previous: p?.value ?? null,
        latest: l.value,
        changeFromFirst: pct(f.value, l.value),
        changeFromPrev: p ? pct(p.value, l.value) : null,
        verdict:
          better === null || series.length < 2
            ? null
            : Math.abs(diff) < 1e-9
              ? "유지"
              : diff > 0 === better
                ? "상향"
                : "하향",
        observations: series.length,
      });
    }

    const ratingDelta =
      last.rating && first.rating && rs.length > 1
        ? RATING_SCORE[last.rating] - RATING_SCORE[first.rating]
        : last.rating && last.prev_rating
          ? RATING_SCORE[last.rating] - RATING_SCORE[last.prev_rating]
          : null;

    const firstTp = rs.find((r) => r.target_price != null)?.target_price ?? null;
    const lastTp =
      [...rs].reverse().find((r) => r.target_price != null)?.target_price ?? null;

    return {
      key,
      name: last.analyst.name,
      brokerage: last.analyst.brokerage,
      reportCount: rs.length,
      firstDate: first.published_at,
      latestDate: last.published_at,
      latestTitle: last.title,
      latestReportId: last.id,
      firstTone: first.tone_score,
      latestTone: last.tone_score,
      toneDelta:
        first.tone_score != null && last.tone_score != null && rs.length > 1
          ? last.tone_score - first.tone_score
          : null,
      latestRating: last.rating,
      ratingDelta,
      firstTargetPrice: firstTp,
      latestTargetPrice: lastTp,
      targetPriceDelta: firstTp != null && lastTp != null ? pct(firstTp, lastTp) : null,
      currency: last.currency,
      revisions,
    };
  });
}

/* ------------------------------ 팩터 집계 ------------------------------ */

export type FactorRollup = {
  name: string;
  category: string | null;
  mentions: number;
  analysts: string[];
  timeline: {
    date: string;
    analyst: string;
    direction: string | null;
    valueText: string | null;
    commentary: string | null;
  }[];
};

/** 표기가 조금씩 달라도 같은 팩터로 묶이도록 이름을 정규화한다. */
function normalizeFactor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s()[\]{}·,./-]/g, "")
    .replace(/가격|단가|price/g, "가격");
}

export function rollupFactors(reports: FullReport[]): FactorRollup[] {
  const acc = new Map<string, FactorRollup>();
  for (const r of reports) {
    for (const f of r.factors) {
      const id = normalizeFactor(f.name);
      const cur =
        acc.get(id) ??
        { name: f.name, category: f.category, mentions: 0, analysts: [], timeline: [] };
      cur.mentions += 1;
      const who = analystKey(r);
      if (!cur.analysts.includes(who)) cur.analysts.push(who);
      cur.timeline.push({
        date: r.published_at,
        analyst: who,
        direction: f.direction,
        valueText: f.value_text,
        commentary: f.commentary,
      });
      acc.set(id, cur);
    }
  }
  return [...acc.values()]
    .map((f) => ({
      ...f,
      timeline: f.timeline.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name));
}

/* ------------------------- 투자포인트 카테고리 추이 ------------------------- */

export type CategoryTrend = {
  category: string;
  /** 발간일별 강조도 합계 — 리포트의 관심이 어디로 이동했는지 보여준다. */
  byDate: { date: string; label: string; emphasis: number }[];
  total: number;
};

export function buildCategoryTrends(reports: FullReport[]): CategoryTrend[] {
  const dates = [...new Set(reports.map((r) => r.published_at))].sort();
  const cats = new Map<string, Map<string, number>>();
  for (const r of reports) {
    for (const p of r.points) {
      const c = p.category ?? "기타";
      const m = cats.get(c) ?? new Map<string, number>();
      m.set(r.published_at, (m.get(r.published_at) ?? 0) + (p.emphasis ?? 50));
      cats.set(c, m);
    }
  }
  return [...cats.entries()]
    .map(([category, m]) => ({
      category,
      byDate: dates.map((d) => ({
        date: d,
        label: shortDate(d),
        emphasis: m.get(d) ?? 0,
      })),
      total: [...m.values()].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);
}

/* ------------------------------- 유틸 ------------------------------- */

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d ? `${y.slice(2)}.${m}.${d}` : iso;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round(x: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

export function pct(from: number, to: number): number | null {
  if (from === 0) return null;
  return round(((to - from) / Math.abs(from)) * 100, 1);
}
