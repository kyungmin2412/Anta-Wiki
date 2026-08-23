import Link from "next/link";
import { Badge, Card, CardHead, Delta, TableScroll } from "./ui";
import { HIGHER_IS_BETTER, METRIC_LABEL, RATING_LABEL, type Rating } from "@/lib/domain";
import { fmtDate, fmtPrice, fmtWithUnit } from "@/lib/format";
import type { AnalystRevision } from "@/lib/aggregate";

/**
 * 기업이 메인 프레임이라면, 이 패널은 그 아래에서 "누가 무엇을 어떻게 바꿨는지"를
 * 애널리스트 단위로 분해해 보여준다.
 */
export default function AnalystPanel({
  companyId,
  revisions,
  colors,
}: {
  companyId: number;
  revisions: AnalystRevision[];
  colors: Record<string, string>;
}) {
  return (
    <Card>
      <CardHead
        title="애널리스트별 추정치 변화"
        hint="각 애널리스트가 자신의 직전 리포트 대비 무엇을 올리고 내렸는지. 낙관도의 기저 수준은 사람마다 달라 절대값보다 본인 대비 변화가 의미 있다."
        right={<Badge tone="neutral">{revisions.length}명</Badge>}
      />
      <div className="divide-y divide-[var(--border)]">
        {revisions.map((a) => (
          <AnalystBlock
            key={a.key}
            companyId={companyId}
            a={a}
            color={colors[a.key]}
          />
        ))}
      </div>
    </Card>
  );
}

function AnalystBlock({
  companyId,
  a,
  color,
}: {
  companyId: number;
  a: AnalystRevision;
  color?: string;
}) {
  const single = a.reportCount < 2;

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-[3px]"
            style={{ background: color ?? "var(--text-muted)", opacity: color ? 1 : 0.35 }}
          />
          <h3 className="text-[14px] font-semibold text-ink">{a.name}</h3>
          <span className="text-[12.5px] text-ink-2">{a.brokerage}</span>
          <span className="text-[12px] text-ink-3">
            리포트 {a.reportCount}건 · {fmtDate(a.firstDate)} ~ {fmtDate(a.latestDate)}
          </span>
        </div>
        {a.latestRating && (
          <Badge tone={ratingTone(a.latestRating as Rating)}>
            {RATING_LABEL[a.latestRating as Rating]}
            {a.ratingDelta != null && a.ratingDelta !== 0 && (
              <span aria-hidden>{a.ratingDelta > 0 ? " ▲상향" : " ▼하향"}</span>
            )}
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <MiniStat
          label="논조"
          value={
            <span className="tnum">
              {a.firstTone ?? "—"}
              {!single && <span className="mx-1 text-ink-3">→</span>}
              {!single && (a.latestTone ?? "—")}
            </span>
          }
          delta={<Delta value={a.toneDelta} suffix="p" neutralBand={4} />}
        />
        <MiniStat
          label="목표주가"
          value={
            <span className="tnum">
              {fmtPrice(a.firstTargetPrice, a.currency)}
              {!single && a.firstTargetPrice !== a.latestTargetPrice && (
                <>
                  <span className="mx-1 text-ink-3">→</span>
                  {fmtPrice(a.latestTargetPrice, a.currency)}
                </>
              )}
            </span>
          }
          delta={<Delta value={a.targetPriceDelta} neutralBand={0.05} />}
        />
        <MiniStat
          label="최신 리포트"
          value={
            <Link
              href={`/companies/${companyId}/reports/${a.latestReportId}`}
              className="truncate text-[13px] font-normal text-ink-2 underline decoration-[var(--border-strong)] underline-offset-2 hover:text-accent"
            >
              {a.latestTitle}
            </Link>
          }
        />
      </div>

      {a.revisions.length > 0 ? (
        <TableScroll>
          <table className="mt-4 w-full min-w-[640px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="py-2 pr-3 font-medium">결산기 · 지표</th>
                <th className="px-3 py-2 text-right font-medium">최초</th>
                <th className="px-3 py-2 text-right font-medium">직전</th>
                <th className="px-3 py-2 text-right font-medium">최신</th>
                <th className="px-3 py-2 text-right font-medium">직전 대비</th>
                <th className="py-2 pl-3 text-right font-medium">판정</th>
              </tr>
            </thead>
            <tbody>
              {a.revisions.map((r) => (
                <tr key={`${r.metric}|${r.period}`} className="border-b border-line/60">
                  <td className="py-2 pr-3 text-ink">
                    <span className="text-ink-3">{r.periodText}</span>{" "}
                    <span className="font-medium">{METRIC_LABEL[r.metric]}</span>
                    {r.observations < 2 && (
                      <span className="ml-1.5 text-[11px] text-ink-3">(1회)</span>
                    )}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-2">
                    {fmtWithUnit(r.first, r.unit)}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-2">
                    {fmtWithUnit(r.previous, r.unit)}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-semibold text-ink">
                    {fmtWithUnit(r.latest, r.unit)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {HIGHER_IS_BETTER[r.metric] === null ? (
                      <span className="tnum text-ink-2">
                        {r.changeFromPrev == null
                          ? "—"
                          : `${r.changeFromPrev > 0 ? "+" : ""}${r.changeFromPrev}%`}
                      </span>
                    ) : (
                      <Delta
                        value={r.changeFromPrev}
                        invert={HIGHER_IS_BETTER[r.metric] === false}
                        neutralBand={0.05}
                      />
                    )}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    {r.verdict ? (
                      <Badge
                        tone={
                          r.verdict === "상향"
                            ? "good"
                            : r.verdict === "하향"
                              ? "bad"
                              : "neutral"
                        }
                      >
                        {r.verdict}
                      </Badge>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <p className="mt-3 text-[12.5px] text-ink-3">
          비교 가능한 추정치가 아직 없다.
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2 truncate text-[14px] font-semibold text-ink">
        {value}
        {delta && <span className="text-[12px]">{delta}</span>}
      </div>
    </div>
  );
}

function ratingTone(r: Rating) {
  if (r === "Buy" || r === "Outperform") return "good" as const;
  if (r === "Sell" || r === "Underperform") return "bad" as const;
  return "neutral" as const;
}
