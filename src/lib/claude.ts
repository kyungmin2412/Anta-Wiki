import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  ReportExtractionSchema,
  SynthesisSchema,
  type ReportExtraction,
  type Synthesis,
} from "./schema";

export const MODEL = process.env.ANTA_MODEL ?? "claude-opus-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    // API 키는 환경변수(ANTHROPIC_API_KEY)나 `ant auth login` 프로필에서 자동 해석된다.
    _client = new Anthropic({ timeout: 900_000, maxRetries: 3 });
  }
  return _client;
}

export class AnalysisError extends Error {}

/** 리팩토링 없이 두 호출이 공유하는 요청 옵션. */
const COMMON = {
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: "adaptive" as const },
  // 안전 분류기가 요청을 거절하면 서버가 대체 모델로 라우팅한다.
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

const EXTRACT_SYSTEM = `당신은 증권사 리서치를 10년 이상 읽어온 버이사이드 애널리스트다.
주어진 증권사 리포트 PDF 한 건을 읽고, 이후 여러 리포트를 시계열로 비교할 수 있도록 구조화해 추출한다.

원칙:
1. 추측하지 말 것. 리포트에 없는 값은 null 또는 빈 배열로 둔다.
2. 실적 추정 테이블은 빠짐없이 옮긴다. 연간 추정치는 최소 2개 연도(당해·차년도)를 포함한다.
   원화 금액은 반드시 '억원'으로 환산한다: 1조원 = 10,000억원, 1십억원 = 10억원, 1백만원 = 0.01억원.
   외화 표기 기업의 금액은 백만USD로 환산한다. EPS·BPS는 원(또는 USD), 비율은 %, 배수는 배.
3. tone_score는 투자의견 등급을 그대로 옮기는 것이 아니다. 본문의 어휘 강도, 유보 표현("다만", "관건은", "확인이 필요"),
   목표주가 조정 방향, 추정치 조정 방향을 종합해 판단한다. 매수 의견이라도 본문이 방어적이면 점수는 낮아진다.
4. factors에는 애널리스트가 반복 추적하는 관측 지표(가격, 출하량, 가동률, 환율, 수주잔고, 마진 등)를 담는다.
   투자포인트(논리)와 팩터(관측 지표)를 구분한다.
5. 인용문(quotes)은 반드시 리포트 원문 그대로 옮긴다.
6. 모든 서술형 필드는 한국어로 작성한다.`;

export async function extractReport(
  pdf: Buffer,
  fileName: string,
): Promise<ReportExtraction> {
  const res = await client().beta.messages.parse({
    ...COMMON,
    system: EXTRACT_SYSTEM,
    output_config: {
      effort: "high",
      format: zodOutputFormat(ReportExtractionSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdf.toString("base64"),
            },
            title: fileName,
          },
          {
            type: "text",
            text: `이 증권사 리포트를 스키마에 맞춰 추출하라. 파일명: ${fileName}
발간일이 본문에 없으면 표지·머리말·꼬리말에서 찾고, 그래도 없으면 파일명에서 추론하라.`,
          },
        ],
      },
    ],
  });

  if (res.stop_reason === "refusal") {
    throw new AnalysisError(
      "모델이 이 문서의 처리를 거절했습니다. 다른 파일로 시도해 주세요.",
    );
  }
  if (!res.parsed_output) {
    throw new AnalysisError("리포트에서 구조화된 데이터를 추출하지 못했습니다.");
  }
  return res.parsed_output;
}

const SYNTH_SYSTEM = `당신은 특정 기업을 오래 커버해온 리서치 총괄이다.
같은 기업에 대한 여러 증권사 리포트에서 이미 추출된 구조화 데이터를 받아,
"증권가의 시각이 시간에 따라 어떻게 변했는가"를 해석한다.

원칙:
1. 개별 리포트 요약을 나열하지 말 것. 반드시 리포트 사이의 '변화'를 서술한다.
2. 근거를 댈 때는 발간일과 애널리스트를 함께 밝힌다.
3. 투자포인트는 표현이 달라도 같은 논리면 하나의 테마로 묶는다.
   (예: "HBM 증설" / "고대역폭 메모리 캐파" → 하나의 테마)
4. 테마 status 판정 기준 — 부상: 최근 리포트에서 새로 등장하거나 강조도가 뚜렷이 커짐 /
   지속: 기간 내내 반복 언급 / 약화: 언급은 되나 강조도가 줄어듦 / 소멸: 초기엔 있었으나 최근 리포트에서 사라짐.
5. 애널리스트마다 낙관도의 기저 수준이 다르다. 절대 점수보다 '그 애널리스트 자신의 이전 리포트 대비 변화'를 본다.
6. 데이터가 부족한 항목은 억지로 채우지 말고 빈 배열로 둔다.
7. 모든 서술은 한국어.`;

export async function synthesizeCompany(payload: unknown): Promise<Synthesis> {
  const res = await client().beta.messages.parse({
    ...COMMON,
    system: SYNTH_SYSTEM,
    output_config: {
      effort: "high",
      format: zodOutputFormat(SynthesisSchema),
    },
    messages: [
      {
        role: "user",
        content: `아래는 한 기업에 대한 증권사 리포트들의 구조화 데이터다(발간일 오름차순).
시간축을 따라 논조·투자포인트·팩터·추정치가 어떻게 변했는지 종합 분석하라.

${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  if (res.stop_reason === "refusal") {
    throw new AnalysisError("모델이 종합 분석 생성을 거절했습니다.");
  }
  if (!res.parsed_output) {
    throw new AnalysisError("종합 분석 생성에 실패했습니다.");
  }
  return res.parsed_output;
}
