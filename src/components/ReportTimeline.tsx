import Link from "next/link";
import DeleteReportButton from "./DeleteReportButton";
import { Badge, Card, CardHead, Delta } from "./ui";
import { RATING_LABEL, type Rating } from "@/lib/domain";
import { fmtDate, fmtPrice, pctChange } from "@/lib/format";
import { analystKey } from "@/lib/aggregate";
import type { FullReport } from "@/lib/types";

export default function ReportTimeline({
  companyId,
  reports,
  colors,
}: {
  companyId: number;
  reports: FullReport[];
  colors: Record<string, string>;
}) {
  return (
    <Card>
      <CardHead title="리포트" hint="최신순" />
      <ul className="divide-y divide-[var(--border)]">
        {reports.map((r) => {
          const key = analystKey(r);
          const tpChange =
            r.target_price != null && r.prev_target_price != null
              ? pctChange(r.prev_target_price, r.target_price)
              : null;
          return (
            <li key={r.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        background: colors[key] ?? "var(--text-muted)",
                        opacity: colors[key] ? 1 : 0.35,
                      }}
                    />
                    <span className="tnum text-[12px] font-medium text-ink-3">
                      {fmtDate(r.published_at)}
                    </span>
                    <span className="text-[12.5px] text-ink-2">
                      {r.analyst.name} · {r.analyst.brokerage}
                    </span>
                    {r.rating && (
                      <Badge
                        tone={
                          r.rating === "Buy" || r.rating === "Outperform"
                            ? "good"
                            : r.rating === "Sell" || r.rating === "Underperform"
                              ? "bad"
                              : "neutral"
                        }
                      >
                        {RATING_LABEL[r.rating as Rating]}
                      </Badge>
                    )}
                    {r.tone_score != null && (
                      <span className="tnum text-[11.5px] text-ink-3">
                        논조 {r.tone_score > 0 ? "+" : ""}
                        {r.tone_score}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/companies/${companyId}/reports/${r.id}`}
                    className="mt-1.5 block text-[14px] font-semibold leading-snug text-ink hover:text-accent"
                  >
                    {r.title}
                  </Link>

                  {r.headline_message && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {r.headline_message}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="tnum text-[13px] font-semibold text-ink">
                    {fmtPrice(r.target_price, r.currency)}
                  </div>
                  {tpChange != null && (
                    <div className="mt-0.5 text-[11.5px]">
                      <Delta value={tpChange} neutralBand={0.05} />
                    </div>
                  )}
                  <div className="mt-2">
                    <DeleteReportButton reportId={r.id} title={r.title} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
