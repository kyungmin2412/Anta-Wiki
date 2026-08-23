import OpenAI from "openai";
import { z } from "zod";
import { AnalysisError } from "./ai-error";
import { toStrictJsonSchema } from "./json-schema-strict";
import { EXTRACT_SYSTEM, SYNTH_SYSTEM } from "./prompts";
import {
  ReportExtractionSchema,
  SynthesisSchema,
  type ReportExtraction,
  type Synthesis,
} from "./schema";

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-5";

export { AnalysisError };

export const NO_CREDENTIALS =
  "OpenAI API 자격 증명이 없습니다. OPENAI_API_KEY를 설정한 뒤 서버를 다시 시작하세요.";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ timeout: 900_000, maxRetries: 3 });
  }
  return _client;
}

export function credentialsAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function toAnalysisError(err: unknown, what: string): AnalysisError {
  if (err instanceof AnalysisError) return err;
  if (err instanceof OpenAI.AuthenticationError) {
    return new AnalysisError(NO_CREDENTIALS);
  }
  const message = (err as Error)?.message ?? "";
  if (err instanceof OpenAI.RateLimitError) {
    return new AnalysisError("API 사용량 한도에 걸렸습니다. 잠시 뒤 다시 시도하세요.");
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new AnalysisError("OpenAI API에 연결하지 못했습니다. 네트워크를 확인하세요.");
  }
  if (err instanceof OpenAI.APIError) {
    const status = err.status ? ` (HTTP ${err.status})` : "";
    return new AnalysisError(`${what} 실패${status}: ${message}`);
  }
  return new AnalysisError(`${what} 실패: ${message}`);
}

async function callOrThrow<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw toAnalysisError(err, what);
  }
}

/** Responses API structured output에서 텍스트를 안전하게 꺼낸다. */
function extractOutputText(res: OpenAI.Responses.Response): string {
  if (res.output_text) return res.output_text;

  for (const item of res.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "refusal") {
          throw new AnalysisError(`모델이 요청 처리를 거절했습니다: ${part.refusal}`);
        }
      }
    }
  }
  throw new AnalysisError(
    `응답에서 텍스트를 찾지 못했습니다 (status: ${res.status ?? "unknown"}).`,
  );
}

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  text: string,
  what: string,
): z.infer<T> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AnalysisError(`${what} 결과가 JSON 형식이 아닙니다.`);
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new AnalysisError(
      `${what} 결과가 스키마와 맞지 않습니다: ${first?.path.join(".")} — ${first?.message}`,
    );
  }
  return r.data;
}

const REPORT_JSON_SCHEMA = toStrictJsonSchema(
  z.toJSONSchema(ReportExtractionSchema, { io: "input" }),
);
const SYNTHESIS_JSON_SCHEMA = toStrictJsonSchema(
  z.toJSONSchema(SynthesisSchema, { io: "input" }),
);

export async function extractReport(
  pdf: Buffer,
  fileName: string,
): Promise<ReportExtraction> {
  const res = await callOrThrow("리포트 분석", () =>
    client().responses.create({
      model: MODEL,
      reasoning: { effort: "high" },
      instructions: EXTRACT_SYSTEM,
      text: {
        format: {
          type: "json_schema",
          name: "report_extraction",
          schema: REPORT_JSON_SCHEMA,
          strict: true,
        },
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
            },
            {
              type: "input_text",
              text: `이 증권사 리포트를 스키마에 맞춰 추출하라. 파일명: ${fileName}
발간일이 본문에 없으면 표지·머리말·꼬리말에서 찾고, 그래도 없으면 파일명에서 추론하라.`,
            },
          ],
        },
      ],
    }),
  );

  const text = extractOutputText(res);
  return parseOrThrow(ReportExtractionSchema, text, "리포트 분석");
}

export async function synthesizeCompany(payload: unknown): Promise<Synthesis> {
  const res = await callOrThrow("종합 분석", () =>
    client().responses.create({
      model: MODEL,
      reasoning: { effort: "high" },
      instructions: SYNTH_SYSTEM,
      text: {
        format: {
          type: "json_schema",
          name: "company_synthesis",
          schema: SYNTHESIS_JSON_SCHEMA,
          strict: true,
        },
      },
      input: [
        {
          role: "user",
          content: `아래는 한 기업에 대한 증권사 리포트들의 구조화 데이터다(발간일 오름차순).
시간축을 따라 논조·투자포인트·팩터·추정치가 어떻게 변했는지 종합 분석하라.

${JSON.stringify(payload, null, 2)}`,
        },
      ],
    }),
  );

  const text = extractOutputText(res);
  return parseOrThrow(SynthesisSchema, text, "종합 분석");
}
