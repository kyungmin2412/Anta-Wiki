import type {
  Direction,
  Metric,
  PointCategory,
  Rating,
  Stance,
  ToneLabel,
  Unit,
} from "./domain";

export type Company = {
  id: number;
  ticker: string | null;
  name: string;
  market: string | null;
  sector: string | null;
  created_at: string;
};

export type CompanySummary = Company & {
  report_count: number;
  analyst_count: number;
  latest_report_at: string | null;
  first_report_at: string | null;
  avg_tone: number | null;
  latest_tone: number | null;
};

export type Analyst = { id: number; name: string; brokerage: string };

export type Estimate = {
  id: number;
  report_id: number;
  fiscal_year: number;
  fiscal_quarter: number | null;
  metric: Metric;
  value: number;
  unit: Unit;
  is_actual: number;
  note: string | null;
};

export type InvestmentPoint = {
  id: number;
  report_id: number;
  seq: number;
  title: string;
  detail: string | null;
  category: PointCategory | null;
  stance: Stance | null;
  emphasis: number | null;
};

export type Factor = {
  id: number;
  report_id: number;
  name: string;
  category: string | null;
  direction: Direction | null;
  value_text: string | null;
  commentary: string | null;
};

export type ReportRow = {
  id: number;
  company_id: number;
  analyst_id: number;
  published_at: string;
  title: string;
  rating: Rating | null;
  rating_raw: string | null;
  prev_rating: Rating | null;
  target_price: number | null;
  prev_target_price: number | null;
  currency: string;
  tone_score: number | null;
  tone_label: ToneLabel | null;
  tone_rationale: string | null;
  conviction: number | null;
  summary: string | null;
  headline_message: string | null;
  file_name: string | null;
  stored_file: string | null;
  created_at: string;
};

export type FullReport = ReportRow & {
  analyst: Analyst;
  estimates: Estimate[];
  points: InvestmentPoint[];
  factors: Factor[];
  risks: string[];
  quotes: { quote: string; context: string | null }[];
};
