/**
 * 리포트 PDF를 폴더째 분석해 넣는다. 브라우저 업로드와 같은 경로를 쓴다.
 *
 *   ANTHROPIC_API_KEY=... npx tsx --conditions=react-server scripts/ingest.mjs ./reports
 *   ... scripts/ingest.mjs ./reports --dry   (파일만 훑고 호출은 하지 않음)
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry");

if (!dir) {
  console.error("사용법: scripts/ingest.mjs <PDF 폴더> [--dry]");
  process.exit(1);
}

const entries = (await fs.readdir(dir, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
  .map((e) => path.join(dir, e.name))
  .sort();

if (entries.length === 0) {
  console.error(`${dir} 안에 PDF가 없습니다.`);
  process.exit(1);
}
console.log(`PDF ${entries.length}건\n`);

if (dryRun) {
  for (const f of entries) {
    const { size } = await fs.stat(f);
    console.log(`  ${path.basename(f)}  ${(size / 1024 / 1024).toFixed(1)}MB`);
  }
  process.exit(0);
}

const { credentialsAvailable, currentModel, extractReport } = await import("../src/lib/ai.ts");
const { sanitizeExtraction } = await import("../src/lib/normalize.ts");
const { REPORT_FILE_DIR } = await import("../src/lib/db.ts");
const { findReportByHash, saveExtraction } = await import("../src/lib/queries.ts");

if (!credentialsAvailable()) {
  console.error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

let ok = 0, skipped = 0, failed = 0;
const today = new Date().toISOString().slice(0, 10);

for (const [i, file] of entries.entries()) {
  const name = path.basename(file);
  process.stdout.write(`[${i + 1}/${entries.length}] ${name} … `);

  const buf = await fs.readFile(file);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  if (findReportByHash(hash)) {
    console.log("이미 분석됨, 건너뜀");
    skipped++;
    continue;
  }

  try {
    const raw = await extractReport(buf, name);
    const { value, warnings } = sanitizeExtraction(raw, { fallbackDate: today });

    const storedFile = `${hash.slice(0, 16)}.pdf`;
    await fs.mkdir(REPORT_FILE_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_FILE_DIR, storedFile), buf);
    saveExtraction(value, { fileName: name, fileHash: hash, storedFile, model: currentModel() });

    console.log(
      `${value.company_name} · ${value.analyst_name}(${value.brokerage}) · ${value.published_at} · ` +
        `논조 ${value.tone_score > 0 ? "+" : ""}${value.tone_score} · 추정치 ${value.estimates.length}건`,
    );
    for (const w of warnings) console.log(`      ▲ ${w}`);
    ok++;
  } catch (err) {
    console.log(`실패 — ${err.message}`);
    failed++;
  }
}

console.log(`\n완료: 성공 ${ok} · 건너뜀 ${skipped} · 실패 ${failed}`);
console.log("기업 페이지에서 '종합 분석 생성'을 눌러 시계열 해석을 만드세요.");
process.exit(failed ? 1 : 0);
