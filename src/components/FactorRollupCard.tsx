import { Badge, Card, CardHead } from "./ui";
import { fmtDate } from "@/lib/format";
import type { FactorRollup } from "@/lib/aggregate";

const MARK: Record<string, string> = {
  상승: "▲",
  하락: "▼",
  횡보: "→",
  혼조: "◆",
  언급만: "·",
};

function tone(d: string | null) {
  if (d === "상승") return "good" as const;
  if (d === "하락") return "bad" as const;
  if (d === "혼조") return "warn" as const;
  return "neutral" as const;
}

/**
 * 팩터는 투자 논리가 아니라 '반복 관측되는 숫자'다.
 * 같은 팩터에 대한 서술이 리포트를 거치며 어떻게 뒤집히는지가 가장 빠른 신호가 된다.
 */
export default function FactorRollupCard({
  factors,
}: {
  factors: FactorRollup[];
}) {
  return (
    <Card>
      <CardHead
        title="추적 지표·팩터"
        hint="여러 리포트에서 반복 언급된 순서. 방향 표시는 그 리포트 시점의 서술 기준이다."
      />
      <div className="divide-y divide-[var(--border)]">
        {factors.map((f) => (
          <div key={f.name} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="text-[13.5px] font-semibold text-ink">{f.name}</h3>
              {f.category && (
                <span className="text-[11.5px] text-ink-3">{f.category}</span>
              )}
              <span className="tnum text-[11.5px] text-ink-3">
                {f.mentions}회 · {f.analysts.length}명
              </span>
            </div>

            <ul className="mt-2.5 space-y-1.5">
              {f.timeline.map((t, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[12.5px]"
                >
                  <span className="tnum w-[76px] shrink-0 text-ink-3">
                    {fmtDate(t.date)}
                  </span>
                  <Badge tone={tone(t.direction)}>
                    <span aria-hidden>{MARK[t.direction ?? "언급만"] ?? "·"}</span>
                    {t.direction ?? "언급"}
                  </Badge>
                  {t.valueText && (
                    <span className="tnum font-medium text-ink">{t.valueText}</span>
                  )}
                  <span className="min-w-0 flex-1 text-ink-2">{t.commentary}</span>
                  <span className="text-[11px] text-ink-3">{t.analyst}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
