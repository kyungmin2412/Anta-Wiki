import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  AnalysisError,
  credentialsAvailable,
  currentModel,
  extractReport,
  noCredentialsMessage,
} from "@/lib/ai";
import { REPORT_FILE_DIR } from "@/lib/db";
import { sanitizeExtraction } from "@/lib/normalize";
import { findReportByHash, saveExtraction } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// PDF 한 건을 정독하고 구조화하는 데 수 분이 걸릴 수 있다.
export const maxDuration = 800;

const MAX_BYTES = 32 * 1024 * 1024; // Claude 문서 입력 상한

/** 리포트 PDF 한 건을 받아 분석하고 저장한다. 여러 건은 클라이언트가 순차 호출한다. */
export async function POST(req: Request) {
  if (!credentialsAvailable()) {
    return NextResponse.json({ error: noCredentialsMessage() }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "업로드를 읽지 못했습니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF 파일이 없습니다." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "PDF 파일만 분석할 수 있습니다." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB).` },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buf).digest("hex");

  const dup = findReportByHash(hash);
  if (dup) {
    return NextResponse.json(
      {
        error: "이미 분석된 리포트입니다.",
        duplicate: true,
        reportId: dup.id,
        companyId: dup.company_id,
      },
      { status: 409 },
    );
  }

  let extraction;
  try {
    extraction = await extractReport(buf, file.name);
  } catch (err) {
    const message =
      err instanceof AnalysisError
        ? err.message
        : `리포트 분석에 실패했습니다: ${(err as Error).message}`;
    console.error("[extract]", file.name, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 스키마는 지켰어도 내용이 정합하다는 보장은 없다 — 정리하고, 사람이 볼 것은 경고로 남긴다.
  const { value: clean, warnings } = sanitizeExtraction(extraction, {
    fallbackDate: new Date().toISOString().slice(0, 10),
  });

  const storedFile = `${hash.slice(0, 16)}.pdf`;
  await fs.mkdir(REPORT_FILE_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORT_FILE_DIR, storedFile), buf);

  const { reportId, companyId } = saveExtraction(clean, {
    fileName: file.name,
    fileHash: hash,
    storedFile,
    model: currentModel(),
  });

  return NextResponse.json({
    reportId,
    companyId,
    company: clean.company_name,
    analyst: clean.analyst_name,
    brokerage: clean.brokerage,
    publishedAt: clean.published_at,
    title: clean.title,
    toneScore: clean.tone_score,
    estimateCount: clean.estimates.length,
    pointCount: clean.investment_points.length,
    factorCount: clean.factors.length,
    warnings,
  });
}
