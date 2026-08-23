import { Badge, Card, CardHead, Prose } from "./ui";
import { fmtDate } from "@/lib/format";
import type { Synthesis } from "@/lib/schema";

const TRAJECTORY_TONE = {
  개선: "good",
  악화: "bad",
  유지: "neutral",
  혼조: "warn",
} as const;

const STATUS_TONE = {
  부상: "good",
  지속: "accent",
  약화: "warn",
  소멸: "bad",
} as const;

const STATUS_MARK = { 부상: "▲", 지속: "＝", 약화: "▽", 소멸: "×" } as const;

export default function SynthesisView({
  s,
  generatedAt,
}: {
  s: Synthesis;
  generatedAt: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHead
          title="증권가 시각 종합"
          hint={`리포트 전체를 가로질러 해석한 결과 · ${generatedAt} 생성`}
        />
        <div className="px-5 py-4">
          <Prose>
            <p>{s.overall_summary}</p>
          </Prose>
        </div>
      </Card>

      <Card>
        <CardHead
          title="논조는 어떻게 변했나"
          right={
            <Badge tone={TRAJECTORY_TONE[s.tone_trajectory.direction]}>
              {s.tone_trajectory.direction}
            </Badge>
          }
        />
        <div className="space-y-5 px-5 py-4">
          <Prose>
            <p>{s.tone_trajectory.narrative}</p>
          </Prose>

          {s.tone_trajectory.inflection_points.length > 0 && (
            <div>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                변곡점
              </h3>
              <ol className="relative space-y-4 border-l border-line pl-5">
                {s.tone_trajectory.inflection_points.map((p, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-[var(--surface-1)]"
                    />
                    <div className="tnum text-[12px] font-semibold text-accent">
                      {fmtDate(p.date)}
                    </div>
                    <div className="mt-0.5 text-[13.5px] font-medium text-ink">
                      {p.what_changed}
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
                      계기: {p.trigger}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {s.tone_by_analyst.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                애널리스트별
              </h3>
              <ul className="space-y-2">
                {s.tone_by_analyst.map((t, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg bg-surface-2 px-3.5 py-2.5"
                  >
                    <span className="text-[13px] font-semibold text-ink">
                      {t.analyst}
                    </span>
                    <span className="text-[12px] text-ink-3">{t.brokerage}</span>
                    <Badge tone={TRAJECTORY_TONE[t.shift]}>{t.shift}</Badge>
                    <span className="w-full text-[12.5px] leading-relaxed text-ink-2">
                      {t.comment}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {s.investment_point_evolution.length > 0 && (
        <Card>
          <CardHead
            title="핵심 투자포인트의 이동"
            hint="표현이 달라도 같은 논리는 하나의 테마로 묶었다. 무엇이 새로 부상하고 무엇이 사라졌는지가 논조 변화의 실체다."
          />
          <div className="divide-y divide-[var(--border)]">
            {s.investment_point_evolution.map((t, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={STATUS_TONE[t.status]}>
                    <span aria-hidden>{STATUS_MARK[t.status]}</span>
                    {t.status}
                  </Badge>
                  <h3 className="text-[14px] font-semibold text-ink">{t.theme}</h3>
                  <span className="tnum text-[11.5px] text-ink-3">
                    {fmtDate(t.first_seen)} ~ {fmtDate(t.last_seen)}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-[1.75] text-ink-2">
                  {t.narrative}
                </p>
                {t.analysts.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-ink-3">
                    언급: {t.analysts.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {s.factor_watch.length > 0 && (
        <Card>
          <CardHead
            title="증권가가 추적하는 지표·팩터"
            hint="투자 논리(포인트)와 달리, 애널리스트가 반복해서 숫자로 확인하는 관측 지표들."
          />
          <div className="divide-y divide-[var(--border)]">
            {s.factor_watch.map((f, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h3 className="text-[13.5px] font-semibold text-ink">{f.factor}</h3>
                  <Badge tone={directionTone(f.trend)}>
                    <span aria-hidden>{directionMark(f.trend)}</span>
                    {f.trend}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.75] text-ink-2">
                  {f.narrative}
                </p>
                {f.mentioned_by.length > 0 && (
                  <p className="mt-1.5 text-[11.5px] text-ink-3">
                    언급: {f.mentioned_by.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHead title="추정치 리비전 요약" />
        <div className="px-5 py-4">
          <Prose>
            <p>{s.estimate_revision_summary}</p>
          </Prose>
        </div>
      </Card>

      {s.divergence.length > 0 && (
        <Card>
          <CardHead
            title="시각이 갈리는 지점"
            hint="합의된 이야기보다, 갈라지는 지점이 리스크와 기회를 더 잘 드러낸다."
          />
          <div className="divide-y divide-[var(--border)]">
            {s.divergence.map((d, i) => (
              <div key={i} className="px-5 py-4">
                <h3 className="text-[13.5px] font-semibold text-ink">{d.issue}</h3>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg border-l-2 border-[var(--good)] bg-surface-2 px-3.5 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--good)]">
                      ▲ 긍정 측
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {d.bull_side}
                    </p>
                  </div>
                  <div className="rounded-lg border-l-2 border-[var(--critical)] bg-surface-2 px-3.5 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--critical)]">
                      ▼ 신중 측
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {d.bear_side}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {s.watch_items.length > 0 && (
        <Card>
          <CardHead title="앞으로 확인할 것" />
          <ul className="space-y-2.5 px-5 py-4">
            {s.watch_items.map((w, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                <span className="tnum mt-0.5 shrink-0 text-[11px] font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function directionTone(d: string) {
  if (d === "상승") return "good" as const;
  if (d === "하락") return "bad" as const;
  if (d === "혼조") return "warn" as const;
  return "neutral" as const;
}

function directionMark(d: string) {
  if (d === "상승") return "▲";
  if (d === "하락") return "▼";
  if (d === "혼조") return "◆";
  if (d === "횡보") return "→";
  return "·";
}
