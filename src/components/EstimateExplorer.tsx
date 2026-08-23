"use client";

import { useMemo, useState } from "react";
import SeriesLineChart, { type ChartRow } from "./SeriesLineChart";
import { Badge, Card, CardHead, Delta, SeriesLegend, TableScroll } from "./ui";
import { HIGHER_IS_BETTER, METRIC_LABEL, type Metric, type Unit } from "@/lib/domain";
import { fmtCompact, fmtWithUnit } from "@/lib/format";
import { SERIES_SLOTS } from "@/lib/palette";

export type TrackMeta = {
  metric: Metric;
  period: string;
  periodText: string;
  unit: Unit;
  coverage: number;
  analysts: number;
};

export type TrackData = {
  rows: ChartRow[];
  analysts: string[];
  unit: Unit | null;
};

type Props = {
  tracks: TrackMeta[];
  data: Record<string, TrackData>;
  colors: Record<string, string>;
};

const trackId = (m: string, p: string) => `${m}|${p}`;

export default function EstimateExplorer({ tracks, data, colors }: Props) {
  const metrics = useMemo(() => {
    const seen: Metric[] = [];
    for (const t of tracks) if (!seen.includes(t.metric)) seen.push(t.metric);
    return seen;
  }, [tracks]);

  const [metric, setMetric] = useState<Metric>(metrics[0]);

  const periods = useMemo(
    () =>
      tracks
        .filter((t) => t.metric === metric)
        .sort((a, b) => a.period.localeCompare(b.period)),
    [tracks, metric],
  );

  const [period, setPeriod] = useState<string>(periods[0]?.period ?? "");
  const active =
    periods.find((p) => p.period === period) ?? periods[0] ?? tracks[0];

  const track = active ? data[trackId(active.metric, active.period)] : undefined;

  const shown = track?.analysts.slice(0, SERIES_SLOTS) ?? [];
  const hidden = (track?.analysts.length ?? 0) - shown.length;

  const unit = track?.unit ?? active?.unit ?? null;
  const fmt = (v: number) => fmtWithUnit(v, unit);
  const tick = (v: number) =>
    unit === "%" || unit === "배" ? `${Math.round(v * 10) / 10}` : fmtCompact(v);

  // 표는 색 대비가 낮은 라이트 모드에서 '색 없이도 읽히는' 대체 경로다.
  const summary = useMemo(() => {
    if (!track) return [];
    return track.analysts.map((key) => {
      const vals = track.rows
        .map((r) => ({ label: String(r.label), v: r[key] }))
        .filter((x) => typeof x.v === "number") as { label: string; v: number }[];
      const first = vals[0];
      const last = vals[vals.length - 1];
      const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
      return {
        key,
        n: vals.length,
        first: first?.v ?? null,
        prev: prev?.v ?? null,
        latest: last?.v ?? null,
        firstLabel: first?.label ?? "",
        latestLabel: last?.label ?? "",
        chgFirst:
          first && last && first.v !== 0
            ? ((last.v - first.v) / Math.abs(first.v)) * 100
            : null,
        chgPrev:
          prev && last && prev.v !== 0
            ? ((last.v - prev.v) / Math.abs(prev.v)) * 100
            : null,
      };
    });
  }, [track]);

  const invert = active ? HIGHER_IS_BETTER[active.metric] === false : false;
  const neutralDirection = active
    ? HIGHER_IS_BETTER[active.metric] === null
    : false;

  if (!active || !track || track.rows.length === 0) return null;

  return (
    <Card>
      <CardHead
        title="실적 추정치 리비전"
        hint="가로축은 리포트 발간일. 같은 결산기에 대한 추정치가 리포트를 거치며 어떻게 조정됐는지 보여준다."
        right={
          <Badge tone="neutral">
            {active.periodText} · {METRIC_LABEL[active.metric]}
          </Badge>
        }
      />

      <div className="flex flex-col gap-2 border-b border-line px-5 py-3">
        <PillRow
          label="지표"
          options={metrics.map((m) => ({ id: m, text: METRIC_LABEL[m] }))}
          value={metric}
          onChange={(v) => {
            const m = v as Metric;
            setMetric(m);
            const next = tracks
              .filter((t) => t.metric === m)
              .sort((a, b) => a.period.localeCompare(b.period));
            setPeriod(next[0]?.period ?? "");
          }}
        />
        <PillRow
          label="결산기"
          options={periods.map((p) => ({
            id: p.period,
            text: p.periodText,
            note: `${p.coverage}건`,
          }))}
          value={active.period}
          onChange={setPeriod}
        />
      </div>

      <div className="px-2 pt-4">
        <SeriesLineChart
          rows={track.rows}
          seriesKeys={shown}
          colors={colors}
          formatValue={fmt}
          formatTick={tick}
          height={320}
          axisLabel={unit ?? undefined}
        />
      </div>

      <SeriesLegend
        keys={shown}
        colors={colors}
        consensusLabel="컨센서스(최신 추정치 평균)"
        note={hidden > 0 ? `외 ${hidden}명은 아래 표에서 확인` : undefined}
      />

      <TableScroll>
        <table className="w-full min-w-[720px] border-t border-line text-[12.5px]">
          <thead>
            <tr className="text-left text-ink-3">
              <th className="px-5 py-2.5 font-medium">애널리스트</th>
              <th className="px-3 py-2.5 text-right font-medium">최초 추정</th>
              <th className="px-3 py-2.5 text-right font-medium">직전 추정</th>
              <th className="px-3 py-2.5 text-right font-medium">최신 추정</th>
              <th className="px-3 py-2.5 text-right font-medium">직전 대비</th>
              <th className="px-5 py-2.5 text-right font-medium">최초 대비</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.key} className="border-t border-line">
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        background: colors[s.key] ?? "var(--text-muted)",
                        opacity: colors[s.key] ? 1 : 0.35,
                      }}
                    />
                    <span className="font-medium text-ink">{s.key}</span>
                    <span className="text-ink-3">· {s.n}건</span>
                  </span>
                </td>
                <td className="tnum px-3 py-2.5 text-right text-ink-2">
                  {fmtWithUnit(s.first, unit)}
                </td>
                <td className="tnum px-3 py-2.5 text-right text-ink-2">
                  {fmtWithUnit(s.prev, unit)}
                </td>
                <td className="tnum px-3 py-2.5 text-right font-semibold text-ink">
                  {fmtWithUnit(s.latest, unit)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {neutralDirection ? (
                    <span className="tnum text-ink-2">
                      {s.chgPrev == null
                        ? "—"
                        : `${s.chgPrev > 0 ? "+" : ""}${s.chgPrev.toFixed(1)}%`}
                    </span>
                  ) : (
                    <Delta value={s.chgPrev} invert={invert} neutralBand={0.05} />
                  )}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {neutralDirection ? (
                    <span className="tnum text-ink-2">
                      {s.chgFirst == null
                        ? "—"
                        : `${s.chgFirst > 0 ? "+" : ""}${s.chgFirst.toFixed(1)}%`}
                    </span>
                  ) : (
                    <Delta value={s.chgFirst} invert={invert} neutralBand={0.05} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </Card>
  );
}

function PillRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; text: string; note?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-10 shrink-0 text-[11.5px] font-medium text-ink-3">
        {label}
      </span>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
              on
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-line bg-surface-1 text-ink-2 hover:border-line-strong"
            }`}
          >
            {o.text}
            {o.note && (
              <span className="ml-1.5 text-[10.5px] text-ink-3">{o.note}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
