/** 리포트 분석 도메인에서 공통으로 쓰는 상수·라벨·정규화 헬퍼. */

export const METRICS = [
  "revenue",
  "operating_profit",
  "net_profit",
  "ebitda",
  "eps",
  "bps",
  "op_margin",
  "roe",
  "per",
  "pbr",
] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABEL: Record<Metric, string> = {
  revenue: "매출액",
  operating_profit: "영업이익",
  net_profit: "지배주주 순이익",
  ebitda: "EBITDA",
  eps: "EPS",
  bps: "BPS",
  op_margin: "영업이익률",
  roe: "ROE",
  per: "PER",
  pbr: "PBR",
};

/** 추정치 그래프에서 먼저 보여줄 순서 (실적 3종 우선). */
export const METRIC_PRIORITY: Metric[] = [
  "operating_profit",
  "revenue",
  "net_profit",
  "eps",
  "ebitda",
  "op_margin",
  "roe",
  "bps",
  "per",
  "pbr",
];

export const UNITS = ["억원", "백만USD", "원", "USD", "%", "배"] as const;
export type Unit = (typeof UNITS)[number];

/** 값이 클수록 좋은 지표인지 (밸류에이션 배수는 방향 판단에서 제외). */
export const HIGHER_IS_BETTER: Record<Metric, boolean | null> = {
  revenue: true,
  operating_profit: true,
  net_profit: true,
  ebitda: true,
  eps: true,
  bps: true,
  op_margin: true,
  roe: true,
  per: null,
  pbr: null,
};

export const RATINGS = [
  "Buy",
  "Outperform",
  "Hold",
  "Underperform",
  "Sell",
  "NotRated",
] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABEL: Record<Rating, string> = {
  Buy: "매수",
  Outperform: "비중확대",
  Hold: "중립",
  Underperform: "비중축소",
  Sell: "매도",
  NotRated: "의견없음",
};

/** 투자의견을 -2(매도) ~ +2(매수) 점수로. 등급 변화 방향 계산에 사용. */
export const RATING_SCORE: Record<Rating, number> = {
  Buy: 2,
  Outperform: 1,
  Hold: 0,
  Underperform: -1,
  Sell: -2,
  NotRated: 0,
};

export const TONE_LABELS = [
  "매우 긍정",
  "긍정",
  "중립",
  "부정",
  "매우 부정",
] as const;
export type ToneLabel = (typeof TONE_LABELS)[number];

export const POINT_CATEGORIES = [
  "실적",
  "밸류에이션",
  "업황·수요",
  "공급·원가",
  "신사업·성장동력",
  "정책·규제",
  "주주환원",
  "경쟁구도",
  "재무·자본",
  "기타",
] as const;
export type PointCategory = (typeof POINT_CATEGORIES)[number];

export const STANCES = ["긍정", "중립", "부정"] as const;
export type Stance = (typeof STANCES)[number];

export const DIRECTIONS = ["상승", "하락", "횡보", "혼조", "언급만"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const POINT_STATUS = ["부상", "지속", "약화", "소멸"] as const;
export type PointStatus = (typeof POINT_STATUS)[number];

export const TONE_TRAJECTORY = ["개선", "악화", "유지", "혼조"] as const;

/** 분기 정보를 포함한 결산기 표기. 예: 2026 / 2026.3Q */
export function periodKey(year: number, quarter?: number | null): string {
  return quarter ? `${year}.${quarter}Q` : `${year}`;
}

export function periodLabel(year: number, quarter?: number | null): string {
  return quarter ? `${year}년 ${quarter}분기` : `${year}년`;
}

export function toneToLabel(score: number): ToneLabel {
  if (score >= 60) return "매우 긍정";
  if (score >= 20) return "긍정";
  if (score > -20) return "중립";
  if (score > -60) return "부정";
  return "매우 부정";
}
