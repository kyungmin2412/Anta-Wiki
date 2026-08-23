import { periodKey } from "./domain";
import type { FullReport } from "./types";

/** 종합 분석 모델에 넘길 압축 payload. 원문 PDF 없이 구조화 데이터만 전달한다. */
export function buildSynthesisInput(companyName: string, reports: FullReport[]) {
  return {
    company: companyName,
    report_count: reports.length,
    period: {
      from: reports[0]?.published_at ?? null,
      to: reports[reports.length - 1]?.published_at ?? null,
    },
    reports: reports.map((r) => ({
      date: r.published_at,
      analyst: r.analyst.name,
      brokerage: r.analyst.brokerage,
      title: r.title,
      headline: r.headline_message,
      summary: r.summary,
      rating: r.rating,
      prev_rating: r.prev_rating,
      target_price: r.target_price,
      prev_target_price: r.prev_target_price,
      currency: r.currency,
      tone_score: r.tone_score,
      tone_label: r.tone_label,
      tone_rationale: r.tone_rationale,
      conviction: r.conviction,
      investment_points: r.points.map((p) => ({
        title: p.title,
        detail: p.detail,
        category: p.category,
        stance: p.stance,
        emphasis: p.emphasis,
      })),
      factors: r.factors.map((f) => ({
        name: f.name,
        direction: f.direction,
        value: f.value_text,
        commentary: f.commentary,
      })),
      estimates: r.estimates.map((e) => ({
        period: periodKey(e.fiscal_year, e.fiscal_quarter),
        metric: e.metric,
        value: e.value,
        unit: e.unit,
        actual: !!e.is_actual,
      })),
      risks: r.risks,
      quotes: r.quotes.map((q) => q.quote),
    })),
  };
}
