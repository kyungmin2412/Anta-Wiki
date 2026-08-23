import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHead, Delta, Prose, TableScroll } from "@/components/ui";
import {
  METRIC_LABEL,
  RATING_LABEL,
  periodLabel,
  type Rating,
} from "@/lib/domain";
import { fmtDate, fmtPrice, fmtWithUnit, pctChange } from "@/lib/format";
import { getCompany, getReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await params;
  const company = getCompany(Number(id));
  const report = getReport(Number(reportId));
  if (!company || !report || report.company_id !== company.id) notFound();

  const tpChange =
    report.target_price != null && report.prev_target_price != null
      ? pctChange(report.prev_target_price, report.target_price)
      : null;

  const annual = report.estimates
    .filter((e) => !e.fiscal_quarter)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);
  const quarterly = report.estimates
    .filter((e) => e.fiscal_quarter)
    .sort(
      (a, b) =>
        a.fiscal_year - b.fiscal_year ||
        (a.fiscal_quarter ?? 0) - (b.fiscal_quarter ?? 0),
    );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <nav className="text-[12.5px] text-ink-3">
        <Link href="/" className="hover:text-accent">
          기업
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/companies/${company.id}`} className="hover:text-accent">
          {company.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-2">리포트</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px]">
          <span className="tnum font-medium text-ink-3">
            {fmtDate(report.published_at)}
          </span>
          <span className="text-ink-2">
            {report.analyst.name} · {report.analyst.brokerage}
          </span>
          {report.rating && (
            <Badge
              tone={
                report.rating === "Buy" || report.rating === "Outperform"
                  ? "good"
                  : report.rating === "Sell" || report.rating === "Underperform"
                    ? "bad"
                    : "neutral"
              }
            >
              {RATING_LABEL[report.rating as Rating]}
              {report.rating_raw && (
                <span className="font-normal opacity-70"> ({report.rating_raw})</span>
              )}
            </Badge>
          )}
        </div>
        <h1 className="mt-2 text-[24px] font-bold leading-snug tracking-tight text-ink">
          {report.title}
        </h1>
        {report.headline_message && (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {report.headline_message}
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile label="목표주가" value={fmtPrice(report.target_price, report.currency)}>
          {tpChange != null && <Delta value={tpChange} neutralBand={0.05} />}
        </Tile>
        <Tile
          label="직전 목표주가"
          value={fmtPrice(report.prev_target_price, report.currency)}
        />
        <Tile
          label="논조"
          value={
            report.tone_score == null
              ? "—"
              : `${report.tone_score > 0 ? "+" : ""}${report.tone_score}`
          }
        >
          {report.tone_label && (
            <span className="text-[12px] text-ink-3">{report.tone_label}</span>
          )}
        </Tile>
        <Tile
          label="확신도"
          value={report.conviction == null ? "—" : `${report.conviction}`}
        >
          <span className="text-[12px] text-ink-3">유보 표현이 많을수록 낮음</span>
        </Tile>
      </div>

      {report.summary && (
        <Card>
          <CardHead title="요약" />
          <div className="px-5 py-4">
            <Prose>
              <p>{report.summary}</p>
            </Prose>
          </div>
        </Card>
      )}

      {report.tone_rationale && (
        <Card>
          <CardHead title="논조 판정 근거" />
          <div className="px-5 py-4">
            <Prose>
              <p>{report.tone_rationale}</p>
            </Prose>
            {report.quotes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {report.quotes.map((q, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-accent bg-surface-2 px-4 py-3"
                  >
                    <p className="text-[13px] italic leading-relaxed text-ink">
                      &ldquo;{q.quote}&rdquo;
                    </p>
                    {q.context && (
                      <p className="mt-1.5 text-[11.5px] text-ink-3">{q.context}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {report.points.length > 0 && (
        <Card>
          <CardHead title="투자포인트" hint="중요도 순" />
          <ol className="divide-y divide-[var(--border)]">
            {report.points.map((p, i) => (
              <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="tnum text-[11px] font-bold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[14px] font-semibold text-ink">{p.title}</h3>
                  {p.category && <Badge tone="neutral">{p.category}</Badge>}
                  {p.stance && (
                    <Badge
                      tone={
                        p.stance === "긍정"
                          ? "good"
                          : p.stance === "부정"
                            ? "bad"
                            : "neutral"
                      }
                    >
                      {p.stance}
                    </Badge>
                  )}
                  {p.emphasis != null && (
                    <span className="tnum text-[11px] text-ink-3">
                      강조도 {p.emphasis}
                    </span>
                  )}
                </div>
                {p.detail && (
                  <p className="mt-1.5 text-[13px] leading-[1.75] text-ink-2">
                    {p.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {report.factors.length > 0 && (
        <Card>
          <CardHead title="언급된 지표·팩터" />
          <ul className="divide-y divide-[var(--border)]">
            {report.factors.map((f) => (
              <li key={f.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h3 className="text-[13px] font-semibold text-ink">{f.name}</h3>
                  {f.direction && (
                    <Badge
                      tone={
                        f.direction === "상승"
                          ? "good"
                          : f.direction === "하락"
                            ? "bad"
                            : "neutral"
                      }
                    >
                      {f.direction}
                    </Badge>
                  )}
                  {f.value_text && (
                    <span className="tnum text-[12.5px] font-medium text-ink-2">
                      {f.value_text}
                    </span>
                  )}
                </div>
                {f.commentary && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                    {f.commentary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {annual.length > 0 && (
        <EstimateTable title="연간 실적 추정" rows={annual} />
      )}
      {quarterly.length > 0 && (
        <EstimateTable title="분기 실적 추정" rows={quarterly} />
      )}

      {report.risks.length > 0 && (
        <Card>
          <CardHead title="리스크 요인" />
          <ul className="space-y-2 px-5 py-4">
            {report.risks.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                <span aria-hidden className="mt-0.5 text-[var(--serious)]">
                  ▲
                </span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-[11.5px] text-ink-3">
        원본 파일: {report.file_name ?? "—"}
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div className="tnum mt-1 text-[18px] font-semibold leading-none text-ink">
        {value}
      </div>
      {children && <div className="mt-1.5 text-[12px]">{children}</div>}
    </div>
  );
}

function EstimateTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: number;
    fiscal_year: number;
    fiscal_quarter: number | null;
    metric: keyof typeof METRIC_LABEL;
    value: number;
    unit: Parameters<typeof fmtWithUnit>[1];
    is_actual: number;
    note: string | null;
  }[];
}) {
  const periods = [
    ...new Map(
      rows.map((r) => [
        `${r.fiscal_year}-${r.fiscal_quarter ?? 0}`,
        { year: r.fiscal_year, quarter: r.fiscal_quarter, actual: r.is_actual },
      ]),
    ).values(),
  ];
  const metrics = [...new Set(rows.map((r) => r.metric))];

  return (
    <Card>
      <CardHead title={title} hint="원문 표기를 억원·원·%·배 기준으로 환산" />
      <TableScroll>
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-ink-3">
              <th className="px-5 py-2.5 text-left font-medium">지표</th>
              {periods.map((p) => (
                <th
                  key={`${p.year}-${p.quarter}`}
                  className="tnum px-3 py-2.5 text-right font-medium"
                >
                  {periodLabel(p.year, p.quarter)}
                  {p.actual ? (
                    <span className="ml-1 text-[10px] text-ink-3">(확정)</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m} className="border-b border-line/60">
                <td className="px-5 py-2.5 font-medium text-ink">
                  {METRIC_LABEL[m]}
                </td>
                {periods.map((p) => {
                  const cell = rows.find(
                    (r) =>
                      r.metric === m &&
                      r.fiscal_year === p.year &&
                      (r.fiscal_quarter ?? null) === (p.quarter ?? null),
                  );
                  return (
                    <td
                      key={`${m}-${p.year}-${p.quarter}`}
                      className="tnum px-3 py-2.5 text-right text-ink-2"
                    >
                      {cell ? fmtWithUnit(cell.value, cell.unit) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </Card>
  );
}
