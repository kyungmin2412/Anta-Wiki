import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { REPORT_FILE_DIR } from "@/lib/db";
import { deleteReport, getReport } from "@/lib/queries";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId)) {
    return NextResponse.json({ error: "잘못된 리포트 ID" }, { status: 400 });
  }

  const report = getReport(reportId);
  if (!report) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const companyId = deleteReport(reportId);
  if (report.stored_file) {
    // 같은 파일을 참조하는 다른 리포트가 없을 때만 원본을 지운다.
    await fs
      .unlink(path.join(REPORT_FILE_DIR, report.stored_file))
      .catch(() => undefined);
  }
  return NextResponse.json({ ok: true, companyId });
}
