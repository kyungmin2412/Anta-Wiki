import { z } from "zod";
import {
  DIRECTIONS,
  METRICS,
  POINT_CATEGORIES,
  POINT_STATUS,
  RATINGS,
  STANCES,
  TONE_LABELS,
  TONE_TRAJECTORY,
  UNITS,
} from "./domain";

/* ------------------------------------------------------------------ *
 * 1단계: 리포트 1건에서 뽑아내는 구조화 데이터
 * ------------------------------------------------------------------ */

export const EstimateSchema = z.object({
  fiscal_year: z.number().int().describe("결산 연도. 예: 2026"),
  fiscal_quarter: z
    .number()
    .int()
    .nullable()
    .describe("분기 추정치면 1~4, 연간 추정치면 null"),
  metric: z.enum(METRICS),
  value: z
    .number()
    .describe(
      "단위로 환산한 숫자값. 손실/마이너스는 음수로. 원문이 '조원'이면 억원으로 환산할 것",
    ),
  unit: z.enum(UNITS),
  is_actual: z
    .boolean()
    .describe("이미 확정된 실적(Actual)이면 true, 추정치(Estimate)면 false"),
  note: z.string().nullable().describe("직전 추정 대비 변경폭 등 부연설명. 없으면 null"),
});

export const InvestmentPointSchema = z.object({
  title: z.string().describe("투자포인트 한 줄 제목 (20자 내외)"),
  detail: z.string().describe("애널리스트가 근거로 제시한 내용 2~3문장"),
  category: z.enum(POINT_CATEGORIES),
  stance: z.enum(STANCES),
  emphasis: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("리포트 내에서 이 포인트가 차지하는 비중/강조도 0~100"),
});

export const FactorSchema = z.object({
  name: z.string().describe("애널리스트가 추적하는 지표·팩터명. 예: DRAM 고정거래가격, 가동률, 환율"),
  category: z.string().describe("팩터 분류. 예: 가격, 물량, 마진, 매크로, 재무"),
  direction: z.enum(DIRECTIONS).describe("리포트가 서술한 해당 팩터의 방향성"),
  value_text: z
    .string()
    .nullable()
    .describe("리포트에 적힌 수치 표현 그대로. 예: '4Q 고정가 +12% QoQ'. 없으면 null"),
  commentary: z.string().describe("이 팩터에 대한 애널리스트의 해석 1~2문장"),
});

export const ReportExtractionSchema = z.object({
  company_name: z.string().describe("분석 대상 기업명 (한글 정식 명칭)"),
  company_ticker: z
    .string()
    .nullable()
    .describe("종목코드. 예: 005930. 없으면 null"),
  market: z.string().nullable().describe("시장. 예: KOSPI, KOSDAQ, NASDAQ. 없으면 null"),
  sector: z.string().nullable().describe("업종. 예: 반도체. 없으면 null"),

  analyst_name: z.string().describe("작성 애널리스트 이름. 확인 불가 시 '미상'"),
  brokerage: z.string().describe("증권사명. 확인 불가 시 '미상'"),

  published_at: z.string().describe("발간일 YYYY-MM-DD"),
  title: z.string().describe("리포트 제목"),
  headline_message: z
    .string()
    .describe("이 리포트가 전하려는 단 하나의 메시지를 한 문장으로"),
  summary: z.string().describe("리포트 요약 3~5문장"),

  rating: z.enum(RATINGS).describe("투자의견을 표준 등급으로 변환"),
  rating_raw: z.string().nullable().describe("리포트에 적힌 투자의견 원문. 없으면 null"),
  prev_rating: z
    .enum(RATINGS)
    .nullable()
    .describe("리포트에 직전 투자의견이 병기되어 있으면 그 값, 없으면 null"),
  target_price: z.number().nullable().describe("목표주가 숫자값. 없으면 null"),
  prev_target_price: z
    .number()
    .nullable()
    .describe("리포트에 병기된 직전 목표주가. 없으면 null"),
  currency: z.enum(["KRW", "USD", "JPY", "EUR", "CNY"]),

  tone_score: z
    .number()
    .int()
    .min(-100)
    .max(100)
    .describe(
      "애널리스트 논조 점수. +100 매우 강한 매수 확신, 0 중립, -100 매우 부정적. " +
        "투자의견 등급이 아니라 본문 어휘·강조·유보 표현을 근거로 판단할 것",
    ),
  tone_label: z.enum(TONE_LABELS),
  tone_rationale: z
    .string()
    .describe("그 논조 점수를 준 근거. 실제 표현을 인용하며 2~3문장"),
  conviction: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("애널리스트의 확신도. 유보·조건부 표현이 많을수록 낮게"),

  estimates: z
    .array(EstimateSchema)
    .describe(
      "리포트의 실적 추정 테이블에서 뽑은 값. 최소한 당해·차년도 매출액/영업이익/순이익은 반드시 포함",
    ),
  investment_points: z
    .array(InvestmentPointSchema)
    .describe("핵심 투자포인트. 중요도 순으로 3~6개"),
  factors: z
    .array(FactorSchema)
    .describe("애널리스트가 명시적으로 추적·언급한 지표와 팩터 3~8개"),
  risks: z.array(z.string()).describe("리포트가 제시한 리스크 요인"),
  quotes: z
    .array(
      z.object({
        quote: z.string().describe("논조를 가장 잘 드러내는 원문 문장 그대로"),
        context: z.string().describe("이 문장이 왜 중요한지 한 줄 설명"),
      }),
    )
    .describe("논조 판단의 근거가 된 인용문 2~4개"),
});

export type ReportExtraction = z.infer<typeof ReportExtractionSchema>;

/* ------------------------------------------------------------------ *
 * 2단계: 기업 단위 종합 분석 (여러 리포트를 가로질러 해석)
 * ------------------------------------------------------------------ */

export const SynthesisSchema = z.object({
  overall_summary: z
    .string()
    .describe("이 기업에 대한 증권가 전반의 시각을 4~6문장으로. 시간 흐름이 드러나야 함"),

  tone_trajectory: z.object({
    direction: z.enum(TONE_TRAJECTORY),
    narrative: z
      .string()
      .describe("논조가 언제, 무엇을 계기로, 어떻게 변했는지 3~5문장"),
    inflection_points: z
      .array(
        z.object({
          date: z.string().describe("YYYY-MM-DD"),
          what_changed: z.string().describe("이 시점에 바뀐 것"),
          trigger: z.string().describe("바뀐 계기"),
        }),
      )
      .describe("논조가 꺾인 변곡점 0~4개"),
  }),

  tone_by_analyst: z
    .array(
      z.object({
        analyst: z.string(),
        brokerage: z.string(),
        shift: z.enum(TONE_TRAJECTORY),
        comment: z.string().describe("이 애널리스트의 논조 변화를 1~2문장으로"),
      }),
    )
    .describe("애널리스트별 논조 변화. 리포트가 2건 이상인 애널리스트 위주"),

  investment_point_evolution: z
    .array(
      z.object({
        theme: z.string().describe("여러 리포트를 관통하는 투자포인트 테마명"),
        status: z.enum(POINT_STATUS),
        first_seen: z.string().describe("처음 등장한 리포트 발간일 YYYY-MM-DD"),
        last_seen: z.string().describe("마지막으로 등장한 리포트 발간일 YYYY-MM-DD"),
        narrative: z
          .string()
          .describe("이 테마가 어떻게 강해지거나 사라졌는지 2~4문장"),
        analysts: z.array(z.string()).describe("이 테마를 언급한 애널리스트명"),
      }),
    )
    .describe("투자포인트의 시간축 변화. 중요도 순 3~8개"),

  factor_watch: z
    .array(
      z.object({
        factor: z.string().describe("반복적으로 추적되는 지표·팩터명"),
        trend: z.enum(DIRECTIONS),
        narrative: z.string().describe("이 팩터에 대한 서술이 어떻게 바뀌었는지 2~3문장"),
        mentioned_by: z.array(z.string()),
      }),
    )
    .describe("증권가가 공통으로 추적하는 핵심 팩터 3~8개"),

  estimate_revision_summary: z
    .string()
    .describe("실적 추정치가 전반적으로 어느 방향으로 얼마나 조정됐는지 3~5문장"),

  divergence: z
    .array(
      z.object({
        issue: z.string().describe("애널리스트 간 시각이 갈리는 쟁점"),
        bull_side: z.string().describe("긍정 측 논리와 그 애널리스트"),
        bear_side: z.string().describe("신중 측 논리와 그 애널리스트"),
      }),
    )
    .describe("의견이 갈리는 쟁점 0~4개"),

  watch_items: z
    .array(z.string())
    .describe("앞으로 확인해야 할 체크포인트 3~5개"),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;
