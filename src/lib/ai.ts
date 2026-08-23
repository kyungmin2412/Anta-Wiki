/**
 * 리포트를 읽는 엔진 선택 지점. 나머지 코드(라우트, 스크립트)는 이 모듈만 참조하고
 * 어느 공급자를 쓰는지는 몰라도 된다 — 둘 다 같은 함수 시그니처를 낸다.
 *
 * AI_PROVIDER=anthropic | openai 로 명시할 수 있다. 명시하지 않으면
 * 실제로 쓸 수 있는 자격 증명이 있는 쪽을 고른다 (둘 다 있거나 둘 다 없으면 anthropic 기본값 —
 * 기존 설치의 동작을 바꾸지 않기 위해서다).
 */
import { AnalysisError } from "./ai-error";
import * as anthropic from "./claude";
import * as openai from "./openai";

export { AnalysisError };

export type Provider = "anthropic" | "openai";

export function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "openai" || explicit === "anthropic") return explicit;

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = anthropic.credentialsAvailable();
  if (hasOpenAI && !hasAnthropic) return "openai";
  return "anthropic";
}

function backend() {
  return resolveProvider() === "openai" ? openai : anthropic;
}

export function credentialsAvailable(): boolean {
  return backend().credentialsAvailable();
}

export function currentModel(): string {
  return backend().MODEL;
}

export function noCredentialsMessage(): string {
  return backend().NO_CREDENTIALS;
}

export function extractReport(
  pdf: Buffer,
  fileName: string,
): ReturnType<typeof anthropic.extractReport> {
  return backend().extractReport(pdf, fileName);
}

export function synthesizeCompany(
  payload: unknown,
): ReturnType<typeof anthropic.synthesizeCompany> {
  return backend().synthesizeCompany(payload);
}
