/**
 * 위키에 무엇이 들어 있는지, 어느 데이터베이스 파일을 보고 있는지 출력한다.
 * "분명히 넣었는데 화면에 안 나온다" 상황의 원인은 대개 폴더가 다른 것이다.
 *
 *   npm run status
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.ANTA_DATA_DIR ?? path.join(process.cwd(), "data");
const dbPath = path.join(DATA_DIR, "anta-wiki.db");

console.log("");
console.log("  지금 보고 있는 폴더");
console.log(`     ${process.cwd()}`);
console.log("");
console.log("  데이터베이스 파일");
console.log(`     ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.log("     └ 아직 없습니다 (리포트를 한 건도 넣지 않은 상태)");
  console.log("");
  process.exit(0);
}
console.log(`     └ 있음 (${(fs.statSync(dbPath).size / 1024).toFixed(0)}KB)`);

const { listCompanies, getReportsForCompany } = await import("../src/lib/queries.ts");
const companies = listCompanies();

console.log("");
if (companies.length === 0) {
  console.log("  등록된 기업: 없음");
  console.log("");
  console.log("  → 리포트가 한 건도 적재되지 않았습니다.");
  console.log("    '리포트 넣기' 를 실행하고 끝까지 기다려 주세요.");
  console.log("");
  process.exit(0);
}

console.log(`  등록된 기업: ${companies.length}개`);
console.log("");
for (const c of companies) {
  console.log(
    `  [${c.id}] ${c.name}${c.ticker ? ` (${c.ticker})` : ""} — 리포트 ${c.report_count}건, 애널리스트 ${c.analyst_count}명`,
  );
  for (const r of getReportsForCompany(c.id).slice(-5)) {
    console.log(
      `        ${r.published_at}  ${r.analyst.name}(${r.analyst.brokerage})  ${r.title}`,
    );
  }
  console.log("");
}
console.log("  브라우저에서 보려면: http://localhost:3000");
console.log("");
