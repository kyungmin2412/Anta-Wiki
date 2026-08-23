/**
 * 개발용 데모 데이터. 실제 리포트 없이 화면과 집계 로직을 확인하기 위한 것.
 *   node scripts/seed-demo.mjs [--reset]
 */
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "../src/lib/db-schema.ts";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.ANTA_DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(path.join(DATA_DIR, "reports"), { recursive: true });
const dbPath = path.join(DATA_DIR, "anta-wiki.db");
if (process.argv.includes("--reset") && fs.existsSync(dbPath)) {
  for (const f of ["", "-wal", "-shm"]) {
    if (fs.existsSync(dbPath + f)) fs.unlinkSync(dbPath + f);
  }
}

const db = new DatabaseSync(dbPath);
db.exec(SCHEMA);

const COMPANY = { ticker: "005930", name: "삼성전자", market: "KOSPI", sector: "반도체" };

const ANALYSTS = [
  { name: "김도현", brokerage: "미래에셋증권" },
  { name: "박서준", brokerage: "한국투자증권" },
  { name: "이수민", brokerage: "NH투자증권" },
  { name: "정민재", brokerage: "삼성증권" },
];

// 시나리오: HBM 물량 논쟁 → 실적 서프라이즈 → 한 명만 밸류에이션 부담으로 톤 다운
const REPORTS = [
  {
    a: 0, date: "2025-09-12", title: "HBM 진입은 시간 문제",
    headline: "HBM4 퀄 통과 시점이 늦어졌을 뿐 방향은 유효하다.",
    rating: "Buy", tp: 78000, prevTp: null, tone: 28, conviction: 55,
    op: [{ y: 2025, v: 320000 }, { y: 2026, v: 480000 }],
    rev: [{ y: 2025, v: 3050000 }, { y: 2026, v: 3380000 }],
    np: [{ y: 2025, v: 260000 }, { y: 2026, v: 380000 }],
    points: [
      ["HBM4 퀄 통과 임박", "경쟁사 대비 6개월 늦었지만 4Q 중 고객사 승인 가능성이 높다.", "신사업·성장동력", "긍정", 80],
      ["레거시 DRAM 가격 반등", "서버 DDR5 고정가가 3분기부터 상승 전환했다.", "업황·수요", "긍정", 60],
      ["파운드리 적자 지속", "2나노 수율 개선 전까지 분기 1조원대 적자가 이어진다.", "실적", "부정", 55],
    ],
    factors: [
      ["DRAM 고정거래가격", "가격", "상승", "3Q +8% QoQ", "서버 수요가 PC·모바일 부진을 상쇄했다."],
      ["HBM 점유율", "물량", "언급만", "20% 내외 추정", "고객사 승인 전까지는 추정치에 반영하지 않았다."],
      ["파운드리 가동률", "물량", "하락", "60%대", "대형 고객 이탈로 회복이 더디다."],
    ],
    risks: ["HBM4 퀄 통과 지연", "파운드리 적자 확대"],
    quotes: [["HBM4 진입은 '되느냐'가 아니라 '언제'의 문제로 보는 것이 합리적이다.", "확신보다 시점에 방점을 둔 유보적 표현"]],
    tone_rationale: "'시간 문제', '가능성이 높다' 등 조건부 표현이 반복되고, 목표주가도 컨센서스 하단이다.",
    summary: "HBM4 진입 지연에도 방향성은 유효하다는 판단. 다만 파운드리 적자가 실적 회복 속도를 제약한다.",
  },
  {
    a: 1, date: "2025-10-05", title: "메모리 사이클, 이제 시작",
    headline: "DRAM 업사이클 초입으로 추정치 상향 여력이 크다.",
    rating: "Buy", tp: 85000, prevTp: 72000, tone: 55, conviction: 70,
    op: [{ y: 2025, v: 335000 }, { y: 2026, v: 540000 }],
    rev: [{ y: 2025, v: 3100000 }, { y: 2026, v: 3520000 }],
    np: [{ y: 2025, v: 275000 }, { y: 2026, v: 430000 }],
    points: [
      ["DRAM 업사이클 초입", "공급 증설이 제한적인 가운데 서버 수요가 구조적으로 늘고 있다.", "업황·수요", "긍정", 90],
      ["HBM 캐파 확대", "2026년 HBM 비트 출하가 두 배 이상 늘어날 전망이다.", "신사업·성장동력", "긍정", 70],
    ],
    factors: [
      ["DRAM 고정거래가격", "가격", "상승", "4Q +12% QoQ 전망", "가격 상승 폭이 시장 기대를 웃돈다."],
      ["재고 수준", "물량", "하락", "정상 재고 하회", "가격 협상력이 공급자 쪽으로 넘어갔다."],
    ],
    risks: ["중국 메모리 업체 증설"],
    quotes: [["지금은 사이클의 끝이 아니라 초입이다.", "사이클 판단을 단정적으로 표현"]],
    tone_rationale: "'구조적', '초입' 같은 단정적 어휘가 늘고 목표주가를 18% 상향했다.",
    summary: "DRAM 가격 상승세가 예상보다 가파르다. 2026년 영업이익 추정치를 대폭 상향한다.",
  },
  {
    a: 2, date: "2025-11-18", title: "HBM 승인, 숫자로 확인할 시간",
    headline: "HBM4 승인이 확인되며 추정 근거가 논리에서 숫자로 바뀌었다.",
    rating: "Buy", tp: 92000, prevTp: null, tone: 62, conviction: 78,
    op: [{ y: 2025, v: 340000 }, { y: 2026, v: 585000 }],
    rev: [{ y: 2025, v: 3120000 }, { y: 2026, v: 3610000 }],
    np: [{ y: 2025, v: 282000 }, { y: 2026, v: 462000 }],
    points: [
      ["HBM4 고객사 승인", "주요 고객사 승인이 확인되며 2026년 물량 가시성이 확보됐다.", "신사업·성장동력", "긍정", 95],
      ["DRAM 업사이클 초입", "가격 상승이 4개 분기 이상 이어질 것으로 본다.", "업황·수요", "긍정", 70],
      ["파운드리 적자 축소", "2나노 수율이 개선되며 적자 폭이 줄어든다.", "실적", "긍정", 40],
    ],
    factors: [
      ["HBM 점유율", "물량", "상승", "2026년 30% 목표", "승인 확인으로 추정치에 정식 반영했다."],
      ["DRAM 고정거래가격", "가격", "상승", "4Q +15% QoQ", "상승 폭이 재차 확대됐다."],
      ["파운드리 가동률", "물량", "상승", "70% 회복", "신규 고객 확보 효과가 나타난다."],
    ],
    risks: ["HBM 경쟁 심화에 따른 가격 하락"],
    quotes: [["이제 논쟁의 대상은 진입 여부가 아니라 마진율이다.", "쟁점 자체가 이동했음을 보여주는 문장"]],
    tone_rationale: "유보 표현이 사라지고 추정치를 모두 상향했다. 목표주가도 컨센서스 상단.",
    summary: "HBM4 승인 확인으로 2026년 영업이익 추정치를 58.5조원으로 상향한다.",
  },
  {
    a: 0, date: "2025-12-08", title: "가시성 확보, 이제는 마진",
    headline: "물량 논쟁은 끝났고 남은 변수는 HBM 마진율이다.",
    rating: "Buy", tp: 95000, prevTp: 78000, tone: 58, conviction: 75,
    op: [{ y: 2025, v: 342000 }, { y: 2026, v: 570000 }],
    rev: [{ y: 2025, v: 3115000 }, { y: 2026, v: 3580000 }],
    np: [{ y: 2025, v: 280000 }, { y: 2026, v: 452000 }],
    points: [
      ["HBM 마진율", "물량 가시성은 확보됐고 이제 수익성이 관건이다.", "실적", "중립", 85],
      ["DRAM 업사이클 초입", "가격 상승 사이클이 2026년 상반기까지 이어진다.", "업황·수요", "긍정", 65],
    ],
    factors: [
      ["HBM 점유율", "물량", "상승", "2026년 28% 추정", "보수적으로 잡아도 두 배 성장이다."],
      ["HBM ASP", "가격", "혼조", "경쟁사 대비 -5%", "초기 진입 할인이 마진을 누른다."],
      ["DRAM 고정거래가격", "가격", "상승", "1Q +10% QoQ 전망", "상승세는 이어지나 폭은 둔화된다."],
    ],
    risks: ["초기 진입 할인에 따른 마진 훼손"],
    quotes: [["진입에 성공했다는 사실과 잘 팔았다는 사실은 다른 이야기다.", "긍정 속에서도 수익성 유보를 유지"]],
    tone_rationale: "목표주가를 22% 올렸지만 마진 관련 유보 표현을 새로 넣었다.",
    summary: "HBM 물량은 확인됐다. 목표주가를 9.5만원으로 올리되 마진율 확인을 조건으로 단다.",
  },
  {
    a: 3, date: "2026-01-30", title: "4Q 서프라이즈, 그러나 눈높이도 올랐다",
    headline: "실적은 좋았지만 주가에 이미 반영된 부분이 크다.",
    rating: "Hold", tp: 88000, prevTp: null, tone: -8, conviction: 62,
    op: [{ y: 2025, v: 348000, actual: true }, { y: 2026, v: 545000 }],
    rev: [{ y: 2025, v: 3140000, actual: true }, { y: 2026, v: 3550000 }],
    np: [{ y: 2025, v: 288000, actual: true }, { y: 2026, v: 438000 }],
    points: [
      ["밸류에이션 부담", "12개월 선행 PER이 5년 평균 상단을 넘어섰다.", "밸류에이션", "부정", 85],
      ["HBM 마진율", "경쟁 심화로 2026년 하반기 ASP 하락이 불가피하다.", "실적", "부정", 70],
    ],
    factors: [
      ["HBM ASP", "가격", "하락", "2H26 -12% 전망", "경쟁사 증설이 본격화된다."],
      ["DRAM 고정거래가격", "가격", "횡보", "1Q +6% QoQ", "상승 폭이 빠르게 둔화되고 있다."],
      ["12M Fwd PER", "밸류에이션", "상승", "14.2배", "5년 평균 11.5배를 크게 웃돈다."],
    ],
    risks: ["HBM 공급 과잉", "밸류에이션 정상화"],
    quotes: [["좋은 기업과 좋은 주가는 구분해야 한다.", "실적과 주가를 분리하는 전형적 중립 논리"]],
    tone_rationale: "실적 호조를 인정하면서도 밸류에이션·ASP 하락을 이유로 중립 의견을 냈다.",
    summary: "4분기 실적은 서프라이즈였으나 밸류에이션 부담이 커졌다. 투자의견 중립으로 시작한다.",
  },
  {
    a: 1, date: "2026-02-14", title: "사이클은 길어진다",
    headline: "공급 제약이 이어지며 업사이클 지속 기간이 길어진다.",
    rating: "Buy", tp: 105000, prevTp: 85000, tone: 68, conviction: 80,
    op: [{ y: 2025, v: 348000, actual: true }, { y: 2026, v: 625000 }, { y: 2027, v: 700000 }],
    rev: [{ y: 2025, v: 3140000, actual: true }, { y: 2026, v: 3720000 }, { y: 2027, v: 3950000 }],
    np: [{ y: 2025, v: 288000, actual: true }, { y: 2026, v: 495000 }, { y: 2027, v: 560000 }],
    points: [
      ["DRAM 업사이클 장기화", "증설 리드타임이 길어 2027년까지 타이트한 수급이 이어진다.", "업황·수요", "긍정", 95],
      ["HBM 캐파 확대", "HBM4E 전환으로 물량과 단가가 동시에 올라간다.", "신사업·성장동력", "긍정", 75],
    ],
    factors: [
      ["DRAM 고정거래가격", "가격", "상승", "2026년 연간 +35%", "연간 상승률 전망을 상향한다."],
      ["설비 리드타임", "물량", "상승", "18개월 이상", "증설로 대응하기 어려운 구조다."],
      ["HBM 점유율", "물량", "상승", "2026년 32%", "고객 다변화가 빠르다."],
    ],
    risks: ["매크로 둔화에 따른 서버 투자 축소"],
    quotes: [["이번 사이클은 공급이 만든 사이클이라 더 길다.", "사이클 지속성에 대한 강한 확신"]],
    tone_rationale: "추정 연도를 2027년까지 확장하고 목표주가를 24% 상향했다. 유보 표현이 거의 없다.",
    summary: "공급 제약 구조를 근거로 업사이클 장기화를 전망한다. 2027년 추정치를 신규 제시한다.",
  },
  {
    a: 2, date: "2026-04-22", title: "마진율 확인, 상향 여력 남았다",
    headline: "HBM 마진이 우려보다 견조해 추정치를 재차 올린다.",
    rating: "Buy", tp: 110000, prevTp: 92000, tone: 72, conviction: 84,
    op: [{ y: 2025, v: 348000, actual: true }, { y: 2026, v: 648000 }, { y: 2027, v: 735000 }],
    rev: [{ y: 2025, v: 3140000, actual: true }, { y: 2026, v: 3760000 }, { y: 2027, v: 4020000 }],
    np: [{ y: 2025, v: 288000, actual: true }, { y: 2026, v: 512000 }, { y: 2027, v: 588000 }],
    points: [
      ["HBM 마진율", "1분기 HBM 영업이익률이 40%를 넘어선 것으로 추정된다.", "실적", "긍정", 90],
      ["DRAM 업사이클 장기화", "2027년까지 이어지는 수급 타이트가 유지된다.", "업황·수요", "긍정", 70],
      ["주주환원 확대", "자사주 소각 규모가 확대될 가능성이 높다.", "주주환원", "긍정", 35],
    ],
    factors: [
      ["HBM ASP", "가격", "상승", "1Q +7% QoQ", "초기 진입 할인이 빠르게 해소됐다."],
      ["HBM 점유율", "물량", "상승", "2026년 34%", "추정치를 재차 상향한다."],
      ["DRAM 고정거래가격", "가격", "상승", "2Q +9% QoQ", "상승세가 재가속됐다."],
    ],
    risks: ["2027년 공급 과잉 전환"],
    quotes: [["할인 판매 우려는 한 분기 만에 근거를 잃었다.", "이전 유보 논리를 스스로 철회하는 문장"]],
    tone_rationale: "직전 리포트의 마진 우려를 명시적으로 철회하고 모든 추정치를 상향했다.",
    summary: "HBM 마진 우려가 해소됐다. 2026년 영업이익 64.8조원으로 상향한다.",
  },
  {
    a: 3, date: "2026-06-11", title: "여전히 비싸다",
    headline: "실적 상향은 인정하나 주가 상승 속도가 더 빠르다.",
    rating: "Hold", tp: 102000, prevTp: 88000, tone: -18, conviction: 70,
    op: [{ y: 2025, v: 348000, actual: true }, { y: 2026, v: 630000 }, { y: 2027, v: 690000 }],
    rev: [{ y: 2025, v: 3140000, actual: true }, { y: 2026, v: 3730000 }, { y: 2027, v: 3900000 }],
    np: [{ y: 2025, v: 288000, actual: true }, { y: 2026, v: 498000 }, { y: 2027, v: 552000 }],
    points: [
      ["밸류에이션 부담", "실적 상향 폭보다 주가 상승 폭이 크다.", "밸류에이션", "부정", 90],
      ["2027년 공급 과잉", "증설 물량이 2027년 하반기부터 시장에 나온다.", "공급·원가", "부정", 65],
    ],
    factors: [
      ["12M Fwd PER", "밸류에이션", "상승", "16.8배", "5년 평균의 1.5배 수준이다."],
      ["설비 리드타임", "물량", "하락", "14개월로 단축", "장비 병목이 풀리기 시작했다."],
      ["DRAM 고정거래가격", "가격", "상승", "2Q +9% QoQ", "가격은 여전히 좋다."],
    ],
    risks: ["2027년 증설 물량 출회"],
    quotes: [["실적을 올려도 목표주가와 현재가의 간격은 좁아지지 않는다.", "추정 상향과 투자의견 유지를 분리하는 논리"]],
    tone_rationale: "추정치는 올렸지만 밸류에이션 표현이 더 강해졌고 중립 의견을 유지했다.",
    summary: "추정치는 상향하되 밸류에이션 부담을 이유로 중립 의견을 유지한다.",
  },
];

const insCompany = db.prepare(
  `INSERT INTO companies (ticker, name, market, sector) VALUES (?,?,?,?)`,
);
const insAnalyst = db.prepare(
  `INSERT INTO analysts (name, brokerage) VALUES (?,?)`,
);

function run() {
  db.exec("DELETE FROM companies; DELETE FROM analysts;");
  const companyId = Number(
    insCompany.run(COMPANY.ticker, COMPANY.name, COMPANY.market, COMPANY.sector)
      .lastInsertRowid,
  );
  const analystIds = ANALYSTS.map((a) =>
    Number(insAnalyst.run(a.name, a.brokerage).lastInsertRowid),
  );

  const insReport = db.prepare(
    `INSERT INTO reports (company_id, analyst_id, published_at, title, rating, rating_raw,
       prev_rating, target_price, prev_target_price, currency, tone_score, tone_label,
       tone_rationale, conviction, summary, headline_message, file_name, file_hash,
       stored_file, extraction_model)
     VALUES (?,?,?,?,?,?,?,?,?,'KRW',?,?,?,?,?,?,?,?,?,'demo-seed')`,
  );
  const insEst = db.prepare(
    `INSERT INTO estimates (report_id, fiscal_year, fiscal_quarter, metric, value, unit, is_actual, note)
     VALUES (?,?,NULL,?,?,'억원',?,NULL)`,
  );
  const insPoint = db.prepare(
    `INSERT INTO investment_points (report_id, seq, title, detail, category, stance, emphasis)
     VALUES (?,?,?,?,?,?,?)`,
  );
  const insFactor = db.prepare(
    `INSERT INTO factors (report_id, name, category, direction, value_text, commentary)
     VALUES (?,?,?,?,?,?)`,
  );
  const insRisk = db.prepare(`INSERT INTO risks (report_id, text) VALUES (?,?)`);
  const insQuote = db.prepare(
    `INSERT INTO quotes (report_id, quote, context) VALUES (?,?,?)`,
  );

  const toneLabel = (s) =>
    s >= 60 ? "매우 긍정" : s >= 20 ? "긍정" : s > -20 ? "중립" : s > -60 ? "부정" : "매우 부정";

  REPORTS.forEach((r, i) => {
    const reportId = Number(
      insReport.run(
        companyId, analystIds[r.a], r.date, r.title, r.rating, null, null,
        r.tp, r.prevTp, r.tone, toneLabel(r.tone), r.tone_rationale, r.conviction,
        r.summary, r.headline, `demo-${i + 1}.pdf`, `demohash${i + 1}`, null,
      ).lastInsertRowid,
    );
    for (const [metric, arr] of [["operating_profit", r.op], ["revenue", r.rev], ["net_profit", r.np]]) {
      for (const e of arr) insEst.run(reportId, e.y, metric, e.v, e.actual ? 1 : 0);
    }
    r.points.forEach((p, j) => insPoint.run(reportId, j, p[0], p[1], p[2], p[3], p[4]));
    for (const f of r.factors) insFactor.run(reportId, f[0], f[1], f[2], f[3], f[4]);
    for (const x of r.risks) insRisk.run(reportId, x);
    for (const q of r.quotes) insQuote.run(reportId, q[0], q[1]);
  });

  console.log(`✓ ${COMPANY.name} · 리포트 ${REPORTS.length}건 · 애널리스트 ${ANALYSTS.length}명`);
}

db.exec("BEGIN");
try {
  run();
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}
