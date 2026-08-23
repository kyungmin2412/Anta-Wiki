/**
 * 추출 결과 JSON을 위키에 적재한다. 모델 호출은 하지 않는다 —
 * PDF를 읽는 일은 API(src/lib/claude.ts)나 Claude Code가 하고, 이 스크립트는 검증·저장만 한다.
 *
 *   npm run import -- extraction.json                  # 리포트 1건
 *   npm run import -- a.json b.json                    # 여러 건
 *   npm run import -- synthesis.json --synthesis 1     # 기업 1번의 종합 분석
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const synthIdx = args.indexOf("--synthesis");
const companyId = synthIdx >= 0 ? Number(args[synthIdx + 1]) : null;
const pdfIdx = args.indexOf("--pdf");
const pdfPath = pdfIdx >= 0 ? args[pdfIdx + 1] : null;
// 플래그와 그 값은 파일 목록에서 빼야 한다 (플래그가 없을 때 0번 인자를 지우지 않도록 주의).
const flagValueIdx = new Set(
  [synthIdx, pdfIdx].filter((i) => i >= 0).map((i) => i + 1),
);
const files = args.filter(
  (a, i) => !a.startsWith("--") && !flagValueIdx.has(i),
);

if (files.length === 0) {
  console.error("사용법: npm run import -- <추출결과.json> [...] [--pdf 원본.pdf] [--synthesis <기업ID>]");
  process.exit(1);
}

const { ReportExtractionSchema, SynthesisSchema } = await import("../src/lib/schema.ts");
const { sanitizeExtraction } = await import("../src/lib/normalize.ts");
const { REPORT_FILE_DIR } = await import("../src/lib/db.ts");
const { saveExtraction, saveSynthesis, getReportsForCompany, synthesisInputHash } =
  await import("../src/lib/queries.ts");

const today = new Date().toISOString().slice(0, 10);

/** 스키마 위반은 조용히 넘기지 않는다 — 어디가 틀렸는지 경로까지 찍어준다. */
function parseOrExit(schema, data, file) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  console.error(`\n✗ ${path.basename(file)} — 스키마에 맞지 않습니다:`);
  for (const issue of r.error.issues.slice(0, 20)) {
    console.error(`   ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  if (r.error.issues.length > 20) {
    console.error(`   … 외 ${r.error.issues.length - 20}건`);
  }
  console.error("\n   `npm run contract` 로 정확한 계약을 확인하세요.");
  process.exit(1);
}

if (companyId != null) {
  if (!Number.isInteger(companyId)) {
    console.error("--synthesis 뒤에는 기업 ID(숫자)가 와야 합니다.");
    process.exit(1);
  }
  const raw = JSON.parse(await fs.readFile(files[0], "utf8"));
  const payload = parseOrExit(SynthesisSchema, raw, files[0]);
  const reports = getReportsForCompany(companyId);
  if (reports.length === 0) {
    console.error(`기업 ${companyId}에 리포트가 없습니다.`);
    process.exit(1);
  }
  saveSynthesis(companyId, synthesisInputHash(reports), payload, "claude-code");
  console.log(`✓ 기업 ${companyId} 종합 분석 저장 (리포트 ${reports.length}건 기준)`);
  process.exit(0);
}

let ok = 0;
for (const file of files) {
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  const parsed = parseOrExit(ReportExtractionSchema, raw, file);
  const { value, warnings } = sanitizeExtraction(parsed, { fallbackDate: today });

  // 원본 PDF를 함께 주면 그 해시로 중복을 막는다. 없으면 내용 기반 해시를 쓴다.
  let hash, storedFile = null, fileName = path.basename(file);
  if (pdfPath && files.length === 1) {
    const buf = await fs.readFile(pdfPath);
    hash = crypto.createHash("sha256").update(buf).digest("hex");
    storedFile = `${hash.slice(0, 16)}.pdf`;
    fileName = path.basename(pdfPath);
    await fs.mkdir(REPORT_FILE_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_FILE_DIR, storedFile), buf);
  } else {
    hash = crypto
      .createHash("sha256")
      .update(`${value.company_name}|${value.analyst_name}|${value.brokerage}|${value.published_at}|${value.title}`)
      .digest("hex");
  }

  try {
    const { companyId: cid } = saveExtraction(value, {
      fileName,
      fileHash: hash,
      storedFile,
      model: "claude-code",
    });
    console.log(
      `✓ ${value.company_name} · ${value.analyst_name}(${value.brokerage}) · ${value.published_at} · ` +
        `논조 ${value.tone_score > 0 ? "+" : ""}${value.tone_score} · 추정치 ${value.estimates.length}건 → /companies/${cid}`,
    );
    for (const w of warnings) console.log(`   ▲ ${w}`);
    ok++;
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      console.log(`· ${value.title} — 이미 등록된 리포트, 건너뜀`);
    } else throw err;
  }
}
console.log(`\n${ok}건 적재 완료.`);
