import { NextResponse } from "next/server";
import { AnalysisError, MODEL, synthesizeCompany } from "@/lib/claude";
import { buildSynthesisInput } from "@/lib/synthesis-input";
import {
  getCompany,
  getReportsForCompany,
  saveSynthesis,
  synthesisInputHash,
} from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companyId = Number(id);
  const company = getCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "기업을 찾을 수 없습니다." }, { status: 404 });
  }

  const reports = getReportsForCompany(companyId);
  if (reports.length === 0) {
    return NextResponse.json(
      { error: "분석할 리포트가 없습니다." },
      { status: 400 },
    );
  }

  try {
    const payload = await synthesizeCompany(
      buildSynthesisInput(company.name, reports),
    );
    saveSynthesis(companyId, synthesisInputHash(reports), payload, MODEL);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof AnalysisError
        ? err.message
        : `종합 분석에 실패했습니다: ${(err as Error).message}`;
    console.error("[synthesis]", companyId, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
