import Link from "next/link";
import { notFound } from "next/navigation";
import AnalystPanel from "@/components/AnalystPanel";
import EstimateExplorer from "@/components/EstimateExplorer";
import FactorRollupCard from "@/components/FactorRollupCard";
import ReportTimeline from "@/components/ReportTimeline";
import SynthesisPanel from "@/components/SynthesisPanel";
import SynthesisView from "@/components/SynthesisView";
import TrendChartCard from "@/components/TrendChartCard";
import { Badge, Card, Empty, StatTile } from "@/components/ui";
import {
  analystKey,
  buildAnalystRevisions,
  buildEstimateSeries,
  buildTargetPriceSeries,
  buildToneSeries,
  listEstimateTracks,
  rollupFactors,
  stableAnalysts,
} from "@/lib/aggregate";
import { RATING_LABEL, toneToLabel, type Rating } from "@/lib/domain";
import { fmtDate, fmtPrice } from "@/lib/format";
import { buildColorMap } from "@/lib/palette";
import {
  getCompany,
  getReportsForCompany,
  getSynthesis,
  synthesisInputHash,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 추정치 탐색기가 다루는 (지표 × 결산기) 조합의 상한 — 너무 많으면 고르기 어려워진다. */
const MAX_TRACKS = 24;

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  const company = getCompany(companyId);
  if (!company) notFound();

  const reports = getReportsForCompany(companyId);

  if (reports.length === 0) {
    return (
      <Empty
        title={`${company.name} — 아직 리포트가 없습니다`}
        description="이 기업의 증권사 리포트를 올리면 분석이 시작됩니다."
        action={
          <Link
            href="/upload"
            className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            리포트 올리기
          </Link>
        }
      />
    );
  }

  // 색은 회사 단위 고정 순서로 애널리스트에 배정된다 — 어떤 차트에서든 같은 사람은 같은 색.
  const analysts = stableAnalysts(reports);
  const colors = buildColorMap(analysts);

  const toneRows = buildToneSeries(reports);
  const priceRows = buildTargetPriceSeries(reports);
  const hasTargetPrice = reports.some((r) => r.target_price != null);
  const priceAnalysts = stableAnalysts(
    reports.filter((r) => r.target_price != null),
  );

  const tracks = listEstimateTracks(reports).slice(0, MAX_TRACKS);
  const trackData = Object.fromEntries(
    tracks.map((t) => {
      const s = buildEstimateSeries(reports, t.metric, t.period);
      return [`${t.metric}|${t.period}`, s];
    }),
  );

  const revisions = buildAnalystRevisions(reports, tracks);
  const factors = rollupFactors(reports).slice(0, 10);

  const latest = reports[reports.length - 1];
  const latestByAnalyst = new Map<string, (typeof reports)[number]>();
  for (const r of reports) latestByAnalyst.set(analystKey(r), r);
  const liveTargets = [...latestByAnalyst.values()]
    .map((r) => r.target_price)
    .filter((v): v is number => v != null);
  const liveTones = [...latestByAnalyst.values()]
    .map((r) => r.tone_score)
    .filter((v): v is number => v != null);
  const avgTone = liveTones.length
    ? Math.round(liveTones.reduce((a, b) => a + b, 0) / liveTones.length)
    : null;
  const avgTarget = liveTargets.length
    ? liveTargets.reduce((a, b) => a + b, 0) / liveTargets.length
    : null;

  const cached = getSynthesis(companyId);
  const currentHash = synthesisInputHash(reports);
  const synthState =
    !cached ? "none" : cached.input_hash === currentHash ? "fresh" : "stale";

  return (
    <div className="space-y-6">
      {/* ── 기업이 메인 틀 ─────────────────────────────────────── */}
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">
              {company.name}
            </h1>
            <p className="tnum mt-1.5 text-[12.5px] text-ink-3">
              {[company.ticker, company.market, company.sector]
                .filter(Boolean)
                .join(" · ") || "종목 정보 미확인"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {avgTone != null && (
              <Badge
                tone={avgTone >= 20 ? "good" : avgTone <= -20 ? "bad" : "neutral"}
              >
                증권가 논조 {toneToLabel(avgTone)}
              </Badge>
            )}
            {latest.rating && (
              <Badge tone="neutral">
                최신 의견 {RATING_LABEL[latest.rating as Rating]}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile label="리포트" value={`${reports.length}건`} sub={`${fmtDate(reports[0].published_at)} ~ ${fmtDate(latest.published_at)}`} />
          <StatTile
            label="애널리스트"
            value={`${analysts.length}명`}
            sub={`${new Set(reports.map((r) => r.analyst.brokerage)).size}개 증권사`}
          />
          <StatTile
            label="평균 논조"
            value={avgTone == null ? "—" : `${avgTone > 0 ? "+" : ""}${avgTone}`}
            sub="각 애널리스트 최신 리포트 기준"
            accent={
              avgTone == null
                ? undefined
                : avgTone >= 20
                  ? "var(--good)"
                  : avgTone <= -20
                    ? "var(--critical)"
                    : undefined
            }
          />
          <StatTile
            label="평균 목표주가"
            value={fmtPrice(avgTarget, latest.currency)}
            sub={
              liveTargets.length
                ? `${liveTargets.length}명 제시 · ${fmtPrice(Math.min(...liveTargets), latest.currency)} ~ ${fmtPrice(Math.max(...liveTargets), latest.currency)}`
                : "제시 없음"
            }
          />
        </div>

        <nav className="mt-5 flex flex-wrap gap-1 border-b border-line pb-0 text-[13px]">
          <Anchor href="#종합">종합</Anchor>
          <Anchor href="#논조">논조 변화</Anchor>
          <Anchor href="#추정치">추정치 리비전</Anchor>
          <Anchor href="#애널리스트">애널리스트별</Anchor>
          <Anchor href="#팩터">팩터</Anchor>
          <Anchor href="#리포트">리포트</Anchor>
        </nav>
      </header>

      {/* ── 종합 해석 ─────────────────────────────────────────── */}
      <section id="종합" className="scroll-mt-20 space-y-4">
        {synthState !== "fresh" && (
          <SynthesisPanel
            companyId={companyId}
            state={synthState}
            reportCount={reports.length}
          />
        )}
        {cached && (
          <SynthesisView s={cached.payload} generatedAt={cached.created_at} />
        )}
        {!cached && reports.length === 1 && (
          <Card className="px-5 py-4">
            <p className="text-[13px] leading-relaxed text-ink-2">
              리포트가 1건이라 아직 &lsquo;변화&rsquo;를 볼 수 없다. 같은 기업의 리포트를
              2건 이상 올리면 논조·투자포인트·추정치가 어떻게 움직였는지 비교된다.
            </p>
          </Card>
        )}
      </section>

      {/* ── 논조 시계열 ───────────────────────────────────────── */}
      <section id="논조" className="scroll-mt-20 space-y-4">
        <TrendChartCard
          kind="tone"
          title="애널리스트 논조 추이"
          hint="리포트 발간일 기준. 같은 애널리스트의 색은 모든 차트에서 동일하다."
          rows={toneRows}
          analysts={analysts}
          colors={colors}
        />
        {hasTargetPrice && (
          <TrendChartCard
            kind="price"
            title="목표주가 추이"
            hint="목표주가는 논조의 가장 물리적인 표현이다. 논조 차트와 방향이 엇갈리는 구간이 특히 눈여겨볼 지점."
            rows={priceRows}
            analysts={priceAnalysts}
            colors={colors}
            currency={latest.currency}
          />
        )}
      </section>

      {/* ── 추정치 리비전 ─────────────────────────────────────── */}
      <section id="추정치" className="scroll-mt-20">
        {tracks.length > 0 ? (
          <EstimateExplorer tracks={tracks} data={trackData} colors={colors} />
        ) : (
          <Card className="px-5 py-8 text-center text-[13px] text-ink-3">
            추출된 실적 추정치가 없습니다.
          </Card>
        )}
      </section>

      {/* ── 애널리스트별 분해 ─────────────────────────────────── */}
      <section id="애널리스트" className="scroll-mt-20">
        <AnalystPanel companyId={companyId} revisions={revisions} colors={colors} />
      </section>

      {/* ── 팩터 ─────────────────────────────────────────────── */}
      <section id="팩터" className="scroll-mt-20">
        {factors.length > 0 && <FactorRollupCard factors={factors} />}
      </section>

      {/* ── 리포트 목록 ───────────────────────────────────────── */}
      <section id="리포트" className="scroll-mt-20">
        <ReportTimeline
          companyId={companyId}
          reports={[...reports].reverse()}
          colors={colors}
        />
      </section>
    </div>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="-mb-px border-b-2 border-transparent px-3 py-2 text-ink-2 transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </a>
  );
}
