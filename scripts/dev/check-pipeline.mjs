/**
 * 추출 이후 전 경로(정리 → 저장 → 집계) 회귀 검증.
 * 모델 호출 없이, 실제 리포트에서 흔히 나오는 지저분한 출력을 그대로 흘려본다.
 *
 *   node --conditions=react-server scripts/dev/check-pipeline.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.ANTA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "anta-check-"));

const { sanitizeExtraction } = await import("../../src/lib/normalize.ts");
const { saveExtraction, getReportsForCompany, listCompanies } = await import(
  "../../src/lib/queries.ts"
);
const {
  buildEstimateSeries,
  buildToneSeries,
  listEstimateTracks,
  buildAnalystRevisions,
  stableAnalysts,
} = await import("../../src/lib/aggregate.ts");

let failed = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** 최소 필드를 채운 추출 결과. 각 케이스에서 필요한 부분만 덮어쓴다. */
function extraction(over = {}) {
  return {
    company_name: "삼성전자",
    company_ticker: "005930",
    market: "KOSPI",
    sector: "반도체",
    analyst_name: "김도현",
    brokerage: "미래에셋증권",
    published_at: "2026-01-15",
    title: "제목",
    headline_message: "한 줄",
    summary: "요약",
    rating: "Buy",
    rating_raw: "매수",
    prev_rating: null,
    target_price: 90000,
    prev_target_price: 80000,
    currency: "KRW",
    tone_score: 40,
    tone_label: "긍정",
    tone_rationale: "근거",
    conviction: 70,
    estimates: [
      { fiscal_year: 2026, fiscal_quarter: null, metric: "operating_profit", value: 500000, unit: "억원", is_actual: false, note: null },
    ],
    investment_points: [
      { title: "포인트", detail: "상세", category: "실적", stance: "긍정", emphasis: 70 },
    ],
    factors: [
      { name: "DRAM 고정거래가격", category: "가격", direction: "상승", value_text: "+10%", commentary: "해설" },
    ],
    risks: ["리스크"],
    quotes: [{ quote: "인용", context: "맥락" }],
    ...over,
  };
}

let seq = 0;
function ingest(over) {
  const { value, warnings } = sanitizeExtraction(extraction(over), {
    fallbackDate: "2026-08-23",
  });
  const saved = saveExtraction(value, {
    fileName: `f${seq}.pdf`,
    fileHash: `hash-${seq++}`,
    storedFile: null,
    model: "test",
  });
  return { value, warnings, ...saved };
}

console.log("\n[1] 발간일 표기 정규화");
for (const [raw, want] of [
  ["2026-03-04", "2026-03-04"],
  ["2026.3.4", "2026-03-04"],
  ["2026/03/04", "2026-03-04"],
  ["2026년 3월 4일", "2026-03-04"],
  ["20260304", "2026-03-04"],
  ["2026-03", "2026-03-01"],
]) {
  const { value } = sanitizeExtraction(extraction({ published_at: raw }), {
    fallbackDate: "2026-08-23",
  });
  check(`"${raw}" → ${want}`, value.published_at === want, value.published_at);
}
{
  const { value, warnings } = sanitizeExtraction(
    extraction({ published_at: "미상" }),
    { fallbackDate: "2026-08-23" },
  );
  check(
    "읽지 못한 발간일은 대체하고 경고",
    value.published_at === "2026-08-23" && warnings.some((w) => w.includes("발간일")),
  );
}
{
  const { value } = sanitizeExtraction(extraction({ published_at: "2026-02-30" }), {
    fallbackDate: "2026-08-23",
  });
  check("존재하지 않는 날짜는 거부", value.published_at === "2026-08-23");
}

console.log("\n[2] 종목코드·인명 표기 흔들림 흡수");
ingest({ company_ticker: "A005930", analyst_name: "김도현 연구원" });
ingest({
  company_ticker: "005930.KS",
  company_name: "삼성전자(005930)",
  analyst_name: "김도현",
  brokerage: "(주)미래에셋증권 리서치센터",
  published_at: "2026-02-20",
  tone_score: 60,
  target_price: 105000,
  estimates: [
    { fiscal_year: 2026, fiscal_quarter: null, metric: "operating_profit", value: 560000, unit: "억원", is_actual: false, note: null },
  ],
});
{
  const companies = listCompanies();
  check("종목코드 표기가 달라도 한 기업으로 병합", companies.length === 1, `${companies.length}개`);
  const reports = getReportsForCompany(companies[0].id);
  check("'연구원' 접미사가 붙어도 한 애널리스트", stableAnalysts(reports).length === 1,
    stableAnalysts(reports).join(", "));
  check("리포트 2건 적재", reports.length === 2);
}

console.log("\n[3] 종목코드 없는 리포트의 회사명 병합");
{
  ingest({
    company_name: "SK하이닉스",
    company_ticker: null,
    published_at: "2026-01-20",
    analyst_name: "정민재",
    brokerage: "삼성증권",
  });
  ingest({
    company_name: "(주)SK 하이닉스 (000660)",
    company_ticker: null,
    published_at: "2026-02-25",
    analyst_name: "정민재",
    brokerage: "삼성증권",
  });
  const hynix = listCompanies().filter((c) => c.name.includes("하이닉스"));
  check("띄어쓰기·괄호가 달라도 한 기업", hynix.length === 1,
    hynix.map((c) => c.name).join(" / "));
  check("표시용 이름은 정리된 형태", hynix[0]?.name === "SK하이닉스", hynix[0]?.name);
  check("리포트 2건이 같은 기업에 누적", hynix[0]?.report_count === 2,
    String(hynix[0]?.report_count));
}

console.log("\n[4] 한 리포트 안의 중복 추정치");
{
  const { warnings, companyId } = ingest({
    published_at: "2026-03-10",
    analyst_name: "박서준",
    brokerage: "한국투자증권",
    estimates: [
      { fiscal_year: 2026, fiscal_quarter: null, metric: "operating_profit", value: 500000, unit: "억원", is_actual: false, note: "본문 표" },
      { fiscal_year: 2026, fiscal_quarter: null, metric: "operating_profit", value: 620000, unit: "억원", is_actual: false, note: "정정치" },
      { fiscal_year: 1900, fiscal_quarter: null, metric: "revenue", value: 1, unit: "억원", is_actual: false, note: null },
    ],
  });
  check("중복 추정치 경고", warnings.some((w) => w.includes("중복")));
  check("비정상 결산 연도 제외 경고", warnings.some((w) => w.includes("결산 연도")));
  const r = getReportsForCompany(companyId).find((x) => x.published_at === "2026-03-10");
  check("중복 중 마지막 값만 남음",
    r.estimates.length === 1 && r.estimates[0].value === 620000,
    JSON.stringify(r.estimates.map((e) => e.value)));
}

console.log("\n[5] 리포트마다 단위가 다를 때");
{
  const { companyId } = ingest({
    published_at: "2026-04-01",
    analyst_name: "이수민",
    brokerage: "NH투자증권",
    // 원화 리포트 사이에 외화 표기가 섞인 경우 — 같은 축에 올리면 스케일이 무너진다.
    estimates: [
      { fiscal_year: 2026, fiscal_quarter: null, metric: "operating_profit", value: 4300, unit: "백만USD", is_actual: false, note: null },
    ],
  });
  const reports = getReportsForCompany(companyId);
  const tracks = listEstimateTracks(reports);
  const track = tracks.find((t) => t.metric === "operating_profit" && t.period === "2026");
  check("트랙 단위는 다수결로 결정", track.unit === "억원", track.unit);
  const series = buildEstimateSeries(reports, "operating_profit", "2026");
  const values = series.rows.flatMap((row) =>
    Object.entries(row).filter(([k]) => k !== "consensus").map(([, v]) => v),
  ).filter((v) => typeof v === "number");
  check("단위가 다른 값은 축에서 제외", !values.includes(4300), JSON.stringify(values));
  check("남은 값은 모두 같은 스케일", values.every((v) => v >= 100000), JSON.stringify(values));
}

console.log("\n[6] 시계열·집계 무결성");
{
  const companyId = listCompanies().find((c) => c.name === "삼성전자").id;
  const reports = getReportsForCompany(companyId);
  const tone = buildToneSeries(reports);
  check("논조 시계열이 발간일 오름차순",
    tone.every((r, i) => i === 0 || tone[i - 1].date <= r.date));
  check("컨센서스에 NaN 없음",
    tone.every((r) => r.consensus === null || Number.isFinite(r.consensus)));

  const tracks = listEstimateTracks(reports);
  const revisions = buildAnalystRevisions(reports, tracks);
  const kim = revisions.find((r) => r.name === "김도현");
  check("김도현 리포트 2건 집계", kim.reportCount === 2, String(kim.reportCount));
  check("논조 변화 +20", kim.toneDelta === 20, String(kim.toneDelta));
  check("목표주가 변화율 계산", kim.targetPriceDelta === 16.7, String(kim.targetPriceDelta));
  const rev = kim.revisions.find((r) => r.metric === "operating_profit" && r.period === "2026");
  check("영업이익 상향 판정", rev.verdict === "상향", rev.verdict);
  check("직전 대비 +12%", rev.changeFromPrev === 12, String(rev.changeFromPrev));
}

console.log("\n[7] 리포트 1건뿐인 기업");
{
  const { companyId } = ingest({
    company_name: "현대차",
    company_ticker: "005380",
    published_at: "2026-05-02",
    target_price: null,
    prev_target_price: null,
  });
  const reports = getReportsForCompany(companyId);
  const revisions = buildAnalystRevisions(reports, listEstimateTracks(reports));
  check("변화량은 null (비교 대상 없음)",
    revisions[0].toneDelta === null && revisions[0].targetPriceDelta === null);
  check("추정치 판정도 null", revisions[0].revisions.every((r) => r.verdict === null));
}

fs.rmSync(process.env.ANTA_DATA_DIR, { recursive: true, force: true });
console.log(failed ? `\n✗ ${failed}건 실패\n` : "\n✓ 전 항목 통과\n");
process.exit(failed ? 1 : 0);
