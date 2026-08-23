import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AnalysisError } from "./ai-error";
import { EXTRACT_SYSTEM, SYNTH_SYSTEM } from "./prompts";
import {
  ReportExtractionSchema,
  SynthesisSchema,
  type ReportExtraction,
  type Synthesis,
} from "./schema";

export const MODEL = process.env.ANTA_MODEL ?? "claude-opus-5";

export { AnalysisError };

export const NO_CREDENTIALS =
  "Claude API 자격 증명이 없습니다. ANTHROPIC_API_KEY를 설정한 뒤 서버를 다시 시작하세요.";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    // API 키는 환경변수(ANTHROPIC_API_KEY)나 `ant auth login` 프로필에서 자동 해석된다.
    _client = new Anthropic({ timeout: 900_000, maxRetries: 3 });
  }
  return _client;
}

/**
 * SDK는 생성이 아니라 요청 시점에 자격 증명을 해석하므로 클라이언트를 만들어 보는 것으로는
 * 확인이 안 된다. 확실히 '없다'고 말할 수 있는 경우만 false를 돌려준다 —
 * PDF를 다 읽고 나서 401로 실패하면 시간과 비용만 버린다.
 */
export function credentialsAvailable(): boolean {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return true;
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (!home) return false;
  return fs.existsSync(path.join(home, ".config", "anthropic"));
}

/** SDK 오류를 사용자가 무엇을 해야 하는지 아는 문장으로 바꾼다. */
function toAnalysisError(err: unknown, what: string): AnalysisError {
  if (err instanceof AnalysisError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new AnalysisError(NO_CREDENTIALS);
  }
  const message = (err as Error)?.message ?? "";
  if (/authentication method|x-api-key|Could not resolve/i.test(message)) {
    return new AnalysisError(NO_CREDENTIALS);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AnalysisError(
      "API 사용량 한도에 걸렸습니다. 잠시 뒤 다시 시도하세요.",
    );
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AnalysisError("Claude API에 연결하지 못했습니다. 네트워크를 확인하세요.");
  }
  if (err instanceof Anthropic.APIError) {
    const status = err.status ? ` (HTTP ${err.status})` : "";
    return new AnalysisError(`${what} 실패${status}: ${message}`);
  }
  return new AnalysisError(`${what} 실패: ${message}`);
}

/** 요청은 실패할 수 있고, 실패 이유는 사용자가 조치할 수 있는 문장이어야 한다. */
async function parseOrThrow<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw toAnalysisError(err, what);
  }
}

/** 두 호출이 공유하는 요청 옵션. */
const COMMON = {
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: "adaptive" as const },
  // 안전 분류기가 요청을 거절하면 서버가 대체 모델로 라우팅한다.
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

export async function extractReport(
  pdf: Buffer,
  fileName: string,
): Promise<ReportExtraction> {
  const res = await parseOrThrow("리포트 분석", () =>
    client().beta.messages.parse({
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
    }),
  );

  if (res.stop_reason === "refusal") {
    throw new AnalysisError(
      "모델이 이 문서의 처리를 거절했습니다. 다른 파일로 시도해 주세요.",
    );
  }
  if (!res.parsed_output) {
    throw new AnalysisError(
      "리포트에서 구조화된 데이터를 추출하지 못했습니다. 스캔 이미지 PDF라면 텍스트가 없어 실패할 수 있습니다.",
    );
  }
  return res.parsed_output;
}

export async function synthesizeCompany(payload: unknown): Promise<Synthesis> {
  const res = await parseOrThrow("종합 분석", () =>
    client().beta.messages.parse({
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
    }),
  );

  if (res.stop_reason === "refusal") {
    throw new AnalysisError("모델이 종합 분석 생성을 거절했습니다.");
  }
  if (!res.parsed_output) {
    throw new AnalysisError("종합 분석 생성에 실패했습니다.");
  }
  return res.parsed_output;
}
