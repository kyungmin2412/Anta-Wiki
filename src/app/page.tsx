import Link from "next/link";
import { Badge, Card, Empty } from "@/components/ui";
import { toneToLabel } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { listCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const companies = listCompanies();

  return (
    <div className="space-y-7">
      <header className="max-w-2xl">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">기업</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          증권사 리포트를 넣으면 애널리스트의 논조가 어떻게 변했는지, 핵심 투자포인트가
          어디로 이동했는지, 실적 추정치가 어떻게 조정됐는지를 기업 단위로 모아 보여준다.
        </p>
      </header>

      {companies.length === 0 ? (
        <Empty
          title="아직 등록된 기업이 없습니다"
          description="증권사 리포트 PDF를 올리면 기업이 자동으로 만들어지고, 같은 기업의 리포트가 쌓일수록 시계열 분석이 깊어집니다."
          action={
            <Link
              href="/upload"
              className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              첫 리포트 올리기
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const tone = c.latest_tone;
            return (
              <Link key={c.id} href={`/companies/${c.id}`} className="group block">
                <Card className="h-full p-5 transition-colors group-hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-semibold tracking-tight text-ink group-hover:text-accent">
                        {c.name}
                      </h2>
                      <p className="tnum mt-0.5 text-[11.5px] text-ink-3">
                        {[c.ticker, c.market, c.sector].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                    {tone != null && (
                      <Badge
                        tone={
                          tone >= 20 ? "good" : tone <= -20 ? "bad" : "neutral"
                        }
                      >
                        {toneToLabel(tone)}
                      </Badge>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    <Stat label="리포트" value={`${c.report_count}건`} />
                    <Stat label="애널리스트" value={`${c.analyst_count}명`} />
                    <Stat
                      label="평균 논조"
                      value={
                        c.avg_tone == null
                          ? "—"
                          : `${c.avg_tone > 0 ? "+" : ""}${c.avg_tone}`
                      }
                    />
                  </dl>

                  <p className="tnum mt-3 text-[11.5px] text-ink-3">
                    {fmtDate(c.first_report_at)} ~ {fmtDate(c.latest_report_at)}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </dt>
      <dd className="tnum mt-0.5 text-[14px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
