/**
 * 기업 종합 분석에 넣을 입력 데이터를 표준출력으로 뽑는다.
 *
 *   npm run synthesis-input -- <기업ID>
 *   npm run synthesis-input          # 기업 목록만 보기
 */
const { getReportsForCompany, getCompany, listCompanies } = await import(
  "../src/lib/queries.ts"
);
const { buildSynthesisInput } = await import("../src/lib/synthesis-input.ts");

const id = Number(process.argv[2]);

if (!Number.isInteger(id)) {
  const companies = listCompanies();
  if (companies.length === 0) {
    console.error("등록된 기업이 없습니다.");
    process.exit(1);
  }
  console.error("기업 ID를 지정하세요:\n");
  for (const c of companies) {
    console.error(
      `  ${c.id}  ${c.name}${c.ticker ? ` (${c.ticker})` : ""} — 리포트 ${c.report_count}건, 애널리스트 ${c.analyst_count}명`,
    );
  }
  process.exit(1);
}

const company = getCompany(id);
if (!company) {
  console.error(`기업 ${id}을(를) 찾을 수 없습니다.`);
  process.exit(1);
}

const reports = getReportsForCompany(id);
if (reports.length < 2) {
  console.error(
    `${company.name}의 리포트가 ${reports.length}건뿐입니다. 2건 이상이어야 '변화'를 볼 수 있습니다.`,
  );
  process.exit(1);
}

console.log(JSON.stringify(buildSynthesisInput(company.name, reports), null, 2));
